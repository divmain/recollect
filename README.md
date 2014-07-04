# Recollect

Recollect is an abstraction layer over [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), providing a rich interface to interact with and query client-side databases.  It is indended to bring a MongoDB-like experience to the browser.

Recollect natively supports all major browsers (IE>10) with the exception of Safari.  Safari support can be attained with the use of a [polyfill](http://nparashuram.com/IndexedDBShim/).  It is asynchronous and non-blocking, and most methods return ES6-compatible promises that resolve to the expected data.

Here's a quick look at what you can do.

```javascript
var r = new Recollect("landOfOz");
r.initialize();
r.createObjectStore({ osName: "characters" });

// ..

r.characters.insertOne({ name: "Dorothy", ownsPets: true, age: 17 })
  .then(function (id) {
    console.log("Dorothy's ID is" + id);
  });

delete r;

// ...

var landOfOz = new Recollect("landOfOz");
landOfOz.initialize();

landOfOz.characters.findOne({ ownsPets: true, age: { $gt: 15, $lt: 20 } })
  .then(function (result) {
    console.log("ID: " + result.id);
    console.log("Object:", result);
  });

// ...

landOfOz.characters.drop();

landOfOz.characters
// undefined

landOfOz.drop();
```

## API

### Recollect

#### `new Recollect(dbName)`

Creates a new Recollect instance.  Provides interface for interacting with specified database.  Should be `initialize`d before use.


#### `.initialize()` -> `Promise`

Initializes the Recollect instance and prepares it for use.  For any object stores previously created on the specified database, a new instance of ObjectStore will be created and attached to the Recollect instance.

The returned promise resolves to the initialized Recollect instance.  Additionally, any pre-existing object stores are initialized and attached to the Recollect instance.

```javascript
var recollect = new Recollect("someDb")  // someDb has two object stores: obstoreA, obstoreB
recollect.initialize().then(function (db) {
   db.obstoreA
   // ObjectStore instance
   db.obstoreB
   // ObjectStore instance 
});
```



#### `.createObjectStore(options)` -> `Promise`

Creates and configures new datastore.  Options:

- `osName` - Name of object store.
- `autoIncrement` - Indicates whether key values should automatically be created as objects are added. (optional, defaults to true)
- `keyPath` - Indicates the path to the key for each object stored. (optional, defaults to `_id`)
- `indexes` - An object indicating which fields to index.
    - `[fieldName]` - Key path of field to index.
    - `[fieldName].unique` - If true, no two entries should share value in this field.
    - `[fieldName].multiEntry` - If true, values in fieldName should be an array of values that can be independently queried.

The returned promise resolves to the new ObjectStore instance.  Additionally, this ObjectStore instance is attached to the parent Recollect instance.

```javascript
recollect.createObjectStore({
  osName: "newDatabase"
}).then(function (objStore) {
   console.log(objStore === recollect.newDatabase);
   // true
});
```


#### `.drop()` -> `Promise`

Destroys the database.

The returned promise resolves to `undefined` on success.


### ObjectStore

#### `.find(query)` -> `Promise`

Takes a [query](#queries), and finds all matching objects.

The returned promise resolves to an array of matching objects in the object store.  If no matches are found, it resolves to an empty array.

```javascript
recollect.animals.find({
  name: /er$/,
  age: { $lt: 5 }
}).then(function (matches) {
  console.log(matches);
  // [{
  //   _id: 148,
  //   name: "tiger",
  //   age: 4
  // }, {
  //   _id: 177,
  //   name: "panther",
  //   age: 3
  // }]
});
```


#### `.findOne(query)` -> `Promise`

Takes a [query](#queries) and finds a single matching object.

The returned promise resolves to the first matching object found in the object store.  If no matches are found, it resolves to `undefined`.

```javascript
recollect.animals.findOne({
  name: /er$/,
  age: { $lt: 5 }
}).then(function (match) {
  console.log(match);
  // {
  //   _id: 148,
  //   name: "tiger",
  //   age: 4
  // }
});
```


#### `.findByIndex(fieldName, value, query)` -> `Promise`

Takes the name of an indexed field, an expected value for that field, and an optional [query]($query) representing additional constraints, and finds all matching objects.  This method is faster than `.find`, as the possible results are first filtered by the indexed field/value before applying the provided query.

The returned promise resolves to an array of matching objects in the object store.  If no matches are found, it resolves to an empty array.

```javascript
recollect.sportsTeams.findByIndex("sport", "football", {
  hasWonChampionship: true
}).then(function (teams) {
  console.log(teams);
  // [{
  //   _id: 7261,
  //   name: "New England Patriots",
  //   sport: "football",
  //   hasWonChampionship: true
  // }, {
  //   _id: 7199,
  //   name: "Seattle Seahawks",
  //   sport: "football",
  //   hasWonChampionship: true
  // }, {
  //   // ...
  // }]
});
```


#### `.findOneByIndex(fieldName, value, query)` -> `Promise`

Takes the name of an indexed field, an expected value for that field, and an optional [query](#queries) representing additional constraints, and finds one matching object.  

The returned promise resolves to the first matching object found in the object store.  If no matches are found, it resolves to `undefined`.

```javascript
recollect.sportsTeams.findOneByIndex("sport", "football", {
  hasWonChampionship: true
}).then(function (team) {
  console.log(team);
  // {
  //   _id: 7261,
  //   name: "New England Patriots",
  //   sport: "football",
  //   hasWonChampionship: true
  // }
});
```


#### `.insertOne(newObject)` -> `Promise`

Takes an object and inserts it into the object store.  If `autoIncrement` was set to `true` for the object store, an error will be thrown if a value is present in the key field.  If `autoIncrement` was set to `false`, an error will be thrown if the value is not present.

The returned promise resolves to the key of the inserted object.

```javascript
recollect.sportsTeams.insertOne({
  name: "Formidable Labs",
  sport: "software-development",
  hasWonChampionship: true 
}).then(function (key) {
  console.log(key);
  // 42
});
```


#### `.insertMany(newObjects)` -> `Promise`

Takes an array of objects and inserts them into the object store.  The same constraints on key values and `autoIncrement` are the same as for `.insertOne`.

The returned promise resolves to an array of keys for the inserted objects.

```javascript
recollect.sportsTeams.insertMany([{
  name: "Microsoft",
  sport: "software-development",
  hasWonChampionship: true
}, {
  name: "Google",
  sport: "software-development",
  hasWonChampionship: true
}]).then(function (keys) {
  console.log(keys);
  // [ 455, 456 ]
});
```


#### `.update(options)` -> `Promise`

Given a query, finds all matching objects and overwrites any properties in each of those objects with the provided new properties.  Options:

- `query` - a Recollect [query](#queries).
- `newProperties` - properties to merge into objects matched by `query`.

The returned promise resolves to `undefined`.


#### `.delete(key)` -> `Promise`

Given a unique key, finds object with key and removes it from the object store.

The returned promise resolves to `undefined`.


#### `.drop()` -> `Promise`

Removes the object store from the database.

The returned promise resolves to `undefined`.


### Queries


#### `$gt`


#### `$lt`


#### `$gte`


#### `$lte`


#### `$neq`


#### `$contains`


#### `$regex`


#### `$fn`


#### `$eq`

In many situations, the `$eq` operator will provide little benefit.  The query `{ name: "Bob" }` behaves identically to `{ name: { $eq: "Bob" } }`

However, it will be very useful in certain circumstances.  For example, what if you are searching for an object that has a regular expression as a property?  If we were to query like so, `{ a: /er$/ }`, it wouldn't find an object whose `a` property equals `/er$/`, it would find an object whose property matches the pattern.

`$eq` provides an alternative: `{ a: { eq: /er$/ } }`.

Similarly, what if you're searching for an object that has a sub-property named `$gte` with a particular value?  Instead of `{ a: { $gte: 1 } }`, you could construct a query like so: `{ a: { $eq: { $gte: 1 } } }`.

At present, there is no mechanism to search for an object that has a property matching on of the provided query operators.


### Errors


### Roadmap

