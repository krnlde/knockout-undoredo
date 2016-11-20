import ko from 'knockout';
import {expect} from 'chai';

import UndoManager from '../index';


class ViewModel {
  name       = ko.observable('Obama');
  birthday   = ko.observable(new Date(1961, 7, 4));
  occupation = ko.observable('President of the United States');
  age        = ko.pureComputed(() => (new Date()).getUTCFullYear() - this.birthday().getUTCFullYear());
}

function waitFor(timeout) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

describe('Knockout Undo Manager', () => {

  let viewModel;
  let undomanager;

  before(() => {
    viewModel = new ViewModel();
  });

  describe('Instatiation', () => {

    beforeEach(() => {
      viewModel.name('Obama');
      undomanager = new UndoManager(viewModel);
    });

    it('should be instanceof UndoManager', () => {
      expect(undomanager).to.be.instanceOf(UndoManager);
    });

    it('should have an undo method', () => {
      expect(undomanager).to.have.property('undo');
      expect(undomanager.undo).be.a.function;
    });

    it('should a redo method', () => {
      expect(undomanager).to.have.property('redo');
      expect(undomanager.redo).be.a.function;
    });

  });

  describe('Undo: Synchronous', () => {
    const steps = 3;

    beforeEach(() => {
      viewModel.name('Obama');
      undomanager = new UndoManager(viewModel, {steps: steps, throttle: 0});
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

  });

  describe('Undo: Asynchonrous', () => {
    const throttle = 50;

    beforeEach(() => {
      viewModel.name('Obama');
      undomanager = new UndoManager(viewModel, {steps: 3, throttle: throttle});
    });

    it(`should undo all changes within ${throttle}ms in one step`, async () => {
      viewModel.name('One');
      viewModel.name('Two');
      viewModel.name('Three');
      viewModel.name('Four');

      await waitFor(throttle);

      undomanager.undo();
      expect(viewModel.name()).to.equal('Obama');
    });

  });
});
