recollect
=========

example usage:

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
