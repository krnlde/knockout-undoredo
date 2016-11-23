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
      undomanager = new UndoManager(viewModel);
    });
    afterEach(() => undomanager.destroy());

    it('should be instanceof UndoManager', () => {
      expect(undomanager).to.be.instanceOf(UndoManager);
    });

    it('should have an undo method', () => {
      expect(undomanager).to.have.property('undo');
      expect(undomanager.undo).be.a.function;
    });

    it('should have a redo method', () => {
      expect(undomanager).to.have.property('redo');
      expect(undomanager.redo).be.a.function;
    });

  });

  describe('Undo: Synchronous', () => {
    const steps = 3;

    beforeEach(() => {
      viewModel = {
        name: ko.observable('Obama')
      };
      undomanager = new UndoManager(viewModel, {steps: steps, throttle: 0});
    });
    afterEach(() => undomanager.destroy());

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
  });

  describe('Undo: Asynchonrous', () => {
    const throttle = 50;

    beforeEach(() => {
      viewModel = {
        name: ko.observable('Obama')
      };
      undomanager = new UndoManager(viewModel, {steps: 3, throttle: throttle});
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

      await waitFor(throttle);

      viewModel.name('Five');
      viewModel.name('Six');
      undomanager.undo();
      expect(viewModel.name()).to.equal('Four');
    });
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
      undomanager = new UndoManager(viewModel);
    });

    it('should initially have 4 subscriptions', () => {
      expect(undomanager._subscriptions.length).to.equal(4);
    });

    it('should remove listeners when array items are deleted', () => {
      viewModel.names.pop();
      expect(undomanager._subscriptions.length).to.equal(3);
    });

    it('should add listeners when array items are added', () => {
      viewModel.names.push(ko.observable('Sanders'));
      expect(undomanager._subscriptions.length).to.equal(5);
    });

  });
});
