recollect
=========

The following would work if you were to enter each line manually.  The library is async, so if this were "real code", the subsequent method calls should be wrapped in `.then` methods.

```javascript
var r = new Recollect("landOfOz");
r.initialize();
r.createObjectStore({ osName: "characters"});
r.characters.insertOne({ name: "Dorothy", ownsPets: true, age: 17 })
  .then(function (id) {
    console.log("Dorothy's ID is" + id);
  });

// ...

r.characters.findOne({ ownsPets: true, age: { $gt: 15 } })
  .then(function (result) {
    console.log("Found:", result);
  });

r.characters.drop();

r.characters
// undefined

r.drop();

delete r;
```
