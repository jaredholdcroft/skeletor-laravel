# JavaScript Helpers

### `js-toggle`

Add this to a target to toggle a given class on target's element. For example:

**Trigger**
```
<a href="#target" class="bemmy__class js-toggle" data-toggleclass="target--active" data-killothers="target">Foo</a>
```

The `killothers` attribute is optional and only needs to be used when you want to act on a group of items such as tabbed panels. Add the class of the target items and their active state will be removed.

**Target**
```
<div class="bar" id="target">Lorem ipsum</div>
```

Now, clicking on `bemmy__class` will toggle `target--active` on `bar`.

### `js-scrollto`

Add this to a link to scroll to an anchor. Uses jump.js.

**Trigger**
```
<a href="#target" class="bemmy__class js-scrollto" data-duration="1000">Foo</a>
```

**Target**
```
<div id="target">Lorem ipsum</div>
```

Now, clicking on `bemmy__class` will scroll to `#target`, if no duration is provided the script defaults to 500ms.

To-do:

* `js-hide`
* `js-show`
