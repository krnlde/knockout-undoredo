[![npm version](https://badge.fury.io/js/knockout-undoredo.svg)](http://badge.fury.io/js/knockout-undoredo)
[![Build Status](https://travis-ci.org/krnlde/knockout-undoredo.svg?branch=master)](https://travis-ci.org/krnlde/knockout-undoredo)
[![Dependency Status](https://david-dm.org/krnlde/knockout-undoredo.svg)](https://david-dm.org/krnlde/knockout-undoredo)
[![devDependency Status](https://david-dm.org/krnlde/knockout-undoredo/dev-status.svg?theme=shields.io)](https://david-dm.org/krnlde/knockout-undoredo#info=devDependencies)

# Knockout Undo-Redo
Generic undo/redo history-management for knockout observables.


## Install

`$ npm install knockout-undoredo`


## Usage

**Heads up:** knockout-undoredo is only available via npm, thus it expects to be run in an node.js environment with `require()` and everything. If you want to use it in the browser you'll have to browserify the final code.

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

| Prop       | Type                 | Default | Description |
| ---------- | -------------------- | ------- |------------ |
| `throttle` | <code>integer</code> | `300`   | Timeout in which changes will be collected into a changeset |
| `steps`    | <code>integer</code> | `30`    | Stack size for undoable/redoable changes |

## Skipping observables

By default all enumerable properties of an object will be subscribed to. If you want to skip a knockout obersvable you can modify the object's `enumerable` property:

```javascript
Object.defineProperty(obj, 'key', {
  enumerable: false,
});
```

If you are one of the lucky guys who can make use of ES2016+ features in your code (i.e. through babel) you can simply import the `nonenumerable` decorator from the `core-decorators` module.

```javascript
import {nonenumerable} from 'core-decorators';

class Example {
    @nonenumerable
    unobserved = ko.observable();
}
```

That way you can still explicitly reference the variable in your code, but it won't be collected by `for`-loops and `Object.keys`, `Object.values` or `Object.entries` respectively. Remember that it'll still be visible to `Object.getOwnPropertyNames`!


# TODOs
* [x] Implement proper garbage collection for old listeners (2016-11-24)
* [ ] Make knockout-undoredo's properties observable themselves. (steps, throttle, past, future, subscriptions, recording) (2016-11-24)
