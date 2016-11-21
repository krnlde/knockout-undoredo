[![npm version](https://badge.fury.io/js/knockout-undoredo.svg)](http://badge.fury.io/js/knockout-undoredo)
[![Build Status](https://travis-ci.org/krnlde/knockout-undoredo.svg?branch=master)](https://travis-ci.org/krnlde/knockout-undoredo)
[![Dependency Status](https://david-dm.org/krnlde/knockout-undoredo.svg)](https://david-dm.org/krnlde/knockout-undoredo)
[![devDependency Status](https://david-dm.org/krnlde/knockout-undoredo/dev-status.svg?theme=shields.io)](https://david-dm.org/krnlde/knockout-undoredo#info=devDependencies)

# Knockout Undo-Redo
This library provides a generic way of history-management for knockout observables.

## Install
`$ npm install knockout-undoredo`

## Usage

```js
import ko from 'knockout';
import UndoManager from 'knockout-undoredo';

class ViewModel {
    constructor() {
        this.name = ko.observable('Obama');
        this.message = ko.pureComputed(() => `Thanks ${this.name()}`);
    }
}

const vm = new ViewModel();

// Connect your viewmodel with the undomanager
const undomanager = new UndoManager(vm);

ko.applyBindings(vm);

// ... and later

console.log(vm.message()); // Thanks Obama
vm.name('Trump');
console.log(vm.message()); // Thanks Trump
undomanager.undo();
console.log(vm.message()); // Thanks Obama
undomanager.redo();
console.log(vm.message()); // Thanks Trump
```

##Create changesets as an undo/redo step

knockout-undoredo has the ability to collect multiple changes over a defined time as a changeset. These collections will be merged to just one undo/redo step in the history timeline.

```js
// ...

const undomanager = new UndoManager(vm, {throttle: 300});

console.log(vm.message()); // Thanks Obama
vm.name('Trump');
vm.name('Clinton');
console.log(vm.message()); // Thanks Clinton
undomanager.undo();
console.log(vm.message()); // Thanks Obama
```

## Constructor Options

<dl>
  <dt>`throttle`: Integer (Default: 300)</dt>
  <dd>Timeout in which changes will be collected into a changeset</dd>
  <dt>`steps`: Integer (Default: 30)</dt>
  <dd>Stack size for undoable/redoable changes</dd>
</dl>
