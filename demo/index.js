import ko from 'knockout';
import UndoManager from '../index';

class ViewModel {

  name = ko.observable();
  message = ko.pureComputed(() => this.name() ? `Hello ${this.name()}, how are you?` : '');
  undomanager;

  constructor({ undomanager } = {}) {
    this.undomanager = undomanager;
  }
}

let undomanager = new UndoManager({throttle: 0});
const vm = new ViewModel({undomanager});
undomanager.startListening(vm);

ko.applyBindings(vm);
