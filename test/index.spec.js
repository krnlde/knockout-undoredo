import ko from 'knockout';
import {expect} from 'chai';

import UndoManager from '../index';

function waitFor(timeout) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

describe('Knockout Undo Manager', () => {

  let viewModel;
  let undomanager;

  describe('Instatiation', () => {

    before(() => {
      viewModel = {
        name: ko.observable('Obama')
      };
    });

    beforeEach(() => {
      undomanager = new UndoManager();
      undomanager.startListening(viewModel);
    });
    afterEach(() => undomanager.destroy());

    it('should be instanceof UndoManager', () => {
      expect(undomanager).to.be.instanceOf(UndoManager);
    });

    it('should have an undo method', () => {
      expect(undomanager).to.have.property('undo');
      expect(undomanager.undo).be.a('function');
    });

    it('should have a redo method', () => {
      expect(undomanager).to.have.property('redo');
      expect(undomanager.redo).be.a('function');
    });

  });

  describe('Undo: Synchronous', () => {
    const steps = 3;

    beforeEach(() => {
      viewModel = {
        name: ko.observable('Obama')
      };
      undomanager = new UndoManager({steps: steps, throttle: 0});
      undomanager.startListening(viewModel);
    });
    afterEach(() => undomanager.destroy());

    it('should have an undo step', () => {
      expect(undomanager.hasUndo()).to.equal(false);
      viewModel.name('Clinton');
      expect(undomanager.hasUndo()).to.equal(true);
      undomanager.undo();
      expect(undomanager.hasUndo()).to.equal(false);
    });

    it('should have a redo step', () => {
      expect(undomanager.hasRedo()).to.equal(false);
      viewModel.name('Clinton');
      expect(undomanager.hasRedo()).to.equal(false);
      undomanager.undo();
      expect(undomanager.hasRedo()).to.equal(true);
      undomanager.redo();
      expect(undomanager.hasRedo()).to.equal(false);
    });

    it('should undo the last change', () => {
      expect(viewModel.name()).to.equal('Obama');
      viewModel.name('Clinton');
      expect(viewModel.name()).to.equal('Clinton');
      undomanager.undo();
      expect(viewModel.name()).to.equal('Obama');
    });

    it('should undo the last two changes', () => {
      viewModel.name('Clinton');
      expect(viewModel.name()).to.equal('Clinton');
      viewModel.name('Trump');
      expect(viewModel.name()).to.equal('Trump');
      undomanager.undo();
      undomanager.undo();
      expect(viewModel.name()).to.equal('Obama');
    });

    it(`should not undo more than ${steps} changes`, () => {
      viewModel.name('One');
      expect(viewModel.name()).to.equal('One');
      viewModel.name('Two');
      expect(viewModel.name()).to.equal('Two');
      viewModel.name('Three');
      expect(viewModel.name()).to.equal('Three');
      viewModel.name('Four');
      expect(viewModel.name()).to.equal('Four');
      undomanager.undo();
      undomanager.undo();
      undomanager.undo();
      undomanager.undo();
      expect(viewModel.name()).to.equal('One');
    });

    it('should handle classes as argument', () => {
      class TestClass {
        test1 = ko.observable('1');
        test2 = ko.observable('2');
        test3 = ko.observable('3');
      }

      class ExtendedTestClass extends TestClass {
        test4 = ko.observable('4');
      }
      const undomanager = new UndoManager();
      const instance = new ExtendedTestClass();
      undomanager.startListening(instance);
      expect(undomanager._subscriptionsCount).to.equal(4);
    });
  });

  describe('Undo: Asynchonrous', () => {
    const throttle = 50;

    beforeEach(() => {
      viewModel = {
        name: ko.observable('Obama')
      };
      undomanager = new UndoManager({steps: 3, throttle: throttle});
      undomanager.startListening(viewModel);
    });
    afterEach(() => undomanager.destroy());

    it(`should undo all changes within ${throttle}ms in one step`, async () => {
      viewModel.name('One');
      viewModel.name('Two');
      viewModel.name('Three');
      viewModel.name('Four');

      await waitFor(throttle);

      undomanager.undo();
      expect(viewModel.name()).to.equal('Obama');
    });

    it(`should bundle all changes within ${throttle}ms into one changeset`, async () => {
      viewModel.name('One');
      viewModel.name('Two');
      viewModel.name('Three');
      viewModel.name('Four');

      await waitFor(throttle + 1);

      viewModel.name('Five');
      viewModel.name('Six');
      undomanager.undo();
      expect(viewModel.name()).to.equal('Four');
    });
  });

  describe('Redo: Synchronous', () => {
    // TODO
  });

  describe('Redo: Asynchronous', () => {
    // TODO
  });

  describe('Taking a Snapshot', () => {
    // TODO
  });

  describe('Garbage Collection', () => {

    beforeEach(() => {
      viewModel = {
        names: ko.observableArray([
          ko.observable('Obama'),
          ko.observable('Clinton'),
          ko.observable('Trump'),
        ]),
      };
      undomanager = new UndoManager();
      undomanager.startListening(viewModel);
    });

    afterEach(() => undomanager.destroy());

    it('should initially have 4 subscriptions', () => {
      expect(undomanager._subscriptionsCount).to.equal(4);
    });

    it('should remove listeners when array items are deleted', () => {
      viewModel.names.pop();
      expect(undomanager._subscriptionsCount).to.equal(3);

      undomanager.undo();

      expect(undomanager._subscriptionsCount).to.equal(4);

      undomanager.redo();

      expect(undomanager._subscriptionsCount).to.equal(3);
    });

    it('should add listeners when array items are added', () => {
      viewModel.names.push(ko.observable('Sanders'));
      expect(undomanager._subscriptionsCount).to.equal(5);

      undomanager.undo();

      expect(undomanager._subscriptionsCount).to.equal(4);

      undomanager.redo();

      expect(undomanager._subscriptionsCount).to.equal(5);
    });
  });

  describe('Garbage Collection - complex structures', () => {

    class Tree { // Adds 1 listener
      branches = ko.observableArray([]);
    }

    class Branch extends Tree { // Adds 1 listener
    }

    class Leaf { // Adds 1 listener
      name = ko.observable();
    }

    let tree;

    beforeEach(() => {
      tree = new Tree();
      undomanager = new UndoManager();
      undomanager.startListening(tree);
    });

    afterEach(() => undomanager.destroy());

    it('should handle adding complex structures', () => {
      expect(undomanager._subscriptionsCount).to.equal(1);

      const leafBranch = new Branch();
      leafBranch.branches.splice(leafBranch.branches().length, 0, new Leaf(), new Leaf());
      tree.branches.push(leafBranch);

      expect(undomanager._subscriptionsCount).to.equal(4);

      const longBranch = new Branch();
      longBranch.branches.splice(longBranch.branches().length, 0, new Branch());
      tree.branches.push(longBranch);
      tree.branches.push(new Branch());

      expect(undomanager._subscriptionsCount).to.equal(7);

      undomanager.undo();
      expect(undomanager._subscriptionsCount).to.equal(1);

      undomanager.redo();
      expect(undomanager._subscriptionsCount).to.equal(7);
      undomanager.undo();

      expect(undomanager._subscriptionsCount).to.equal(1);
    });

    it('should handle deleting complex structures', () => {
      const leafBranch = new Branch();
      leafBranch.branches.splice(leafBranch.branches().length, 0, new Leaf(), new Leaf());
      tree.branches.push(leafBranch);

      const longBranch = new Branch();
      longBranch.branches.splice(longBranch.branches().length, 0, new Branch());
      tree.branches.push(longBranch);
      tree.branches.push(new Branch());

      undomanager.takeSnapshot();

      expect(undomanager._subscriptionsCount).to.equal(7);

      tree.branches.removeAll();
      expect(undomanager._subscriptionsCount).to.equal(1);

      undomanager.undo();

      expect(undomanager._subscriptionsCount).to.equal(7);

      undomanager.redo();

      expect(undomanager._subscriptionsCount).to.equal(1);
    });

    it('should handle deeply nested structures', () => {
      let branch = tree;
      const depth = 50;
      for (let i = 0; i < depth; i += 1) {
        const nextBranch = new Branch();
        branch.branches.push(nextBranch);
        branch = nextBranch;
      }
      branch.branches.splice(branch.branches().length, 0, new Leaf(), new Leaf(), new Leaf(), new Leaf());
      expect(undomanager._subscriptionsCount).to.equal(depth + 5);

      undomanager.undo();

      expect(undomanager._subscriptionsCount).to.equal(1);

      undomanager.redo();

      expect(undomanager._subscriptionsCount).to.equal(depth + 5);
    });

  });

  describe('Github issues', () => {

    describe('#3 - Crashes on circular references', () => {
      it('should not throw on circular dependencies in Arrays', () => {
        function init() {
          const undomanager = new UndoManager();

          let semiCircleA = ko.observableArray();
          let semiCircleB = ko.observableArray();

          // Creating the circular reference here:
          semiCircleA.push(semiCircleB);
          semiCircleB.push(semiCircleA);

          undomanager.startListening(semiCircleA);

          undomanager.destroy();
        }

        expect(init).not.to.throw();
      });

      it('should not throw on circular dependencies in Classes', () => {
        function init() {
          const undomanager = new UndoManager();

          class BasicProperties {
            static staticObservable = ko.observable('static observable');
            isNull = null;
            isString = 'string';
            isNumber = 42;
            isArray = [1,2,3,4];
            isObject = {a: 1, b: 2};
          }

          class DoubleLinkedListItem extends BasicProperties {
            name = ko.observable('');
            previous = null;
            next = null;

            constructor(name = '') {
              super();
              this.name(name);
            }

            addBefore(item) {
              this.previous  = item;
              item.next = this;
            }

            addAfter(item) {
              this.next = item;
              item.previous = this;
            }
          }

          const item1 = new DoubleLinkedListItem('Name1');
          const item2 = new DoubleLinkedListItem('Name2');

          item1.addAfter(item2);
          item2.addAfter(item1);

          undomanager.startListening(item1);

          expect(undomanager._subscriptionsCount).to.equal(2);

          item1.name('Renamed');
          expect(item1.name()).to.equal('Renamed');

          expect(undomanager.hasUndo()).to.equal(true);
          expect(undomanager.hasRedo()).to.equal(false);
          undomanager.undo();
          expect(undomanager.hasUndo()).to.equal(false);
          expect(undomanager.hasRedo()).to.equal(true);

          expect(item1.name()).to.equal('Name1');

          undomanager.destroy();
        }

        expect(init).not.to.throw();
      });
    });
  })
});
