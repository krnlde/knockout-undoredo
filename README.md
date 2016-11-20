# Knockout Undo-Redo
This library provides a generic way of history-management for knockout observables.

## Install
`$> npm install knockout-undoredo`

## Usage

```js
import ko from 'knockout';
import UndoManager from 'knockout-undoredo';

class ViewModel {
    constructor() {
        this.name = ko.observable('Kai');
        this.message = ko.pureComputed(() => `Hello ${this.name()}, how are you`);
    }
}

const vm = new ViewModel();
const undomanager = new UndoManager(vm);
ko.applyBindings(vm);

// ...later

console.log(vm.message()); // 'Hello Kai';
vm.name('Rita');
console.log(vm.message()); // 'Hello Rita';
undomanager.undo();
console.log(vm.message()); // 'Hello Kai';
undomanager.redo();
console.log(vm.message()); // 'Hello Rita';
```
