# Recollect

Recollect is an abstraction layer over [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), providing a rich interface to interact with and query client-side databases.

Recollect natively supports all major browsers (IE>9, Safari<=7.1).  Support in some older browsers can be attained through use of a [polyfill](http://nparashuram.com/IndexedDBShim/).  Recollect is asynchronous and non-blocking, and most methods return ES6-compatible promises that resolve to the expected data.

------

## Table of Contents

- [Example](#example)
- [API](#api)
    - [Recollect](#recollect-1)
        - [`new Recollect(dbName)`](#new-recollectdbname)
        - [`.initialize()` -> `Promise`](#initialize---promise)
        - [`.createObjectStore(options)` -> `Promise`](#createobjectstoreoptions---promise)
        - [`.drop()` -> `Promise`](#drop---promise)
    - [ObjectStore](#objectstore)
        - [`.find(query)` -> `Promise`](#findquery---promise)
        - [`.findOne(query)` -> `Promise`](#findonequery---promise)
        - [`.findByIndex(fieldName, value, query)` -> `Promise`](#findbyindexfieldname-value-query---promise)
        - [`.findOneByIndex(fieldName, value, query)` -> `Promise`](#findonebyindexfieldname-value-query---promise)
        - [`.insertOne(newObject)` -> `Promise`](#insertonenewobject---promise)
        - [`.insertMany(newObjects)` -> `Promise`](#insertmanynewobjects---promise)
        - [`.update(options)` -> `Promise`](#updateoptions---promise)
        - [`.replace(keyPath, newObject)` -> `Promise`](#replacekeypath-newobject---promise)
        - [`.delete(key)` -> `Promise`](#deletekey---promise)
        - [`.drop()` -> `Promise`](#drop---promise-1)
- [Queries](#queries)
    - [`$gt` operator](#gt-operator)
    - [`$lt` operator](#lt-operator)
    - [`$gte` operator](#gte-operator)
    - [`$lte` operator](#lte-operator)
    - [`$neq` operator](#neq-operator)
    - [`$contains` operator](#contains-operator)
    - [`$regex` operator](#regex-operator)
    - [`$fn` operator](#fn-operator)
    - [`$eq` operator](#eq-operator)
- [Errors](#errors)


------

## Example

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

// ...

var landOfOz = new Recollect("landOfOz");
landOfOz.initialize();

landOfOz.characters.findOne({ ownsPets: true, age: { $gt: 15, $lt: 20 } })
  .then(function (result) {
    console.log("ID: " + result._id);
    console.log("Object:", result);
  });

// ...

landOfOz.characters.drop();

landOfOz.characters
// undefined

landOfOz.drop();
```


------

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


------

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

Takes the name of an indexed field, an expected value for that field, and an optional [query](#queries) representing additional constraints, and finds all matching objects.  This method is faster than `.find`, as the possible results are first filtered by the indexed field/value before applying the provided query.

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


#### `.update(query, newProperties)` -> `Promise`

Given a query, finds all matching objects and overwrites any properties in each of those objects with the provided new properties.

- `query` - a Recollect [query](#queries).
- `newProperties` - properties to merge into objects matched by `query`.

The returned promise resolves to `undefined`.


#### `.replace(key, newObject)` -> `Promise`

Given a unique `key`, replaces the identified object with the provided `newObject`

The returned promise resolves to `undefined`.


#### `.delete(key)` -> `Promise`

Given a unique key, finds object with key and removes it from the object store.

The returned promise resolves to `undefined`.


#### `.drop()` -> `Promise`

Removes the object store from the database.

The returned promise resolves to `undefined`.


------

## Queries

Query-literals are fundamental to extracting data from your databases.  They're used by several methods, including the [find](#findquery---promise)-class methods and [update](#updateoptions---promise).

A query-literal is an object constructed of key-paths and a set of conditions related to the desired data at that key-path.  They look like the following:

```javascript
{
  "thing": "something",
  "key.val": { $lte: 5.5 }
}
```

Key-paths are period-delimited, meaning that you can query against deep values of objects in your database.  The query above translates to the following english phrase:

> Find an object that has a property `thing` whose value equals `"something"`.  This object should also have a property `key`, whose value is an object with property `val`.  The value of `val` should be less than or equal to `5.5`

It would match the following object, among others:

```javascript
{
  thing: "something",
  key: {
    "val": 4
  }
}
```

There are several query operators, documented below.

If you do not use operators, and instead pass in specific values, the following rules apply:

- if a key-path's value is a regular expression, it is interpreted as shorthand for the [$regex](#regex-operator) operator;
- if a key-path's value is a [javascript primitive](http://en.wikibooks.org/wiki/JavaScript/Variables_and_Types#Primitive_Types), it is interpreted as shorthand for the [$eq](#eq-operator) operator;
- if a key-path's value is an object that includes non-operators (`$gt`, `$lt`, etc.), it is interpreted as shorthand for the [$eq-operator](#eq) operator.

The following is an example of the above three conditions:

```javascript
{
  val1: /someRegexMatch/,
  val2: true,
  val3: { $gt: 5, nonOperator: true }
}
```

If you have an object with a property that contains an actual `.` character, you can escape it like so:

```javascript
{
  "shallow\\.key": "someValue"
}
```


### `$gt` operator

This condition is true if the value found at the key-path indicated is greater than the provided value.

**Given:**
```javascript
{
  "keypath": { $gt: 5 }
}
```

**True:**
```javascript
{
  keypath: 8
}
```

**False:**
```javascript
{
  keypath: 4
}
```

All comparisons are done [Lexicographically](http://en.wikipedia.org/wiki/Lexicographical_order).


### `$lt` operator

This condition is true if the value found at the key-path indicated is less than the provided value.

**Given:**
```javascript
{
  "keypath": { $lt: 5 }
}
```

**True:**
```javascript
{
  keypath: 4
}
```

**False:**
```javascript
{
  keypath: 8
}
```

All comparisons are done [lexicographically](http://en.wikipedia.org/wiki/Lexicographical_order).


### `$gte` operator

This condition is true if the value found at the key-path indicated is greater than or equal to the provided value.

**Given:**
```javascript
{
  "keypath": { $gte: 5 }
}
```

**True:**
```javascript
{
  keypath: 5
}
```

**False:**
```javascript
{
  keypath: 4.9
}
```

All comparisons are done [Lexicographically](http://en.wikipedia.org/wiki/Lexicographical_order).


### `$lte` operator

This condition is true if the value found at the key-path indicated is less than or equal to the provided value.

**Given:**
```javascript
{
  "keypath": { $lte: 5 }
}
```

**True:**
```javascript
{
  keypath: 5
}
```

**False:**
```javascript
{
  keypath: 5.1
}
```


All comparisons are done [Lexicographically](http://en.wikipedia.org/wiki/Lexicographical_order).


### `$neq` operator

This condition is true if the value found at the key-path indicated is not equal to the provided value.

**Given:**
```javascript
{
  "keypath": { $neq: 5 }
}
```

**True:**
```javascript
{
  keypath: 5
}
```

**False:**
```javascript
{
  keypath: "hello"
}
```


### `$contains` operator

This condition is true if the value found at the key-path indicated is a string that contains the provided value.

**Given:**
```javascript
{
  "keypath": { $contains: "name" }
}
```

**True:**
```javascript
{
  keypath: "Hello, my name is George."
}
```

**False:**
```javascript
{
  keypath: "Hello, I am Jerry."
}
```


### `$regex` operator

This condition is true if the value found at the key-path indicated is a string that matches the provided regular expression.

**Given:**
```javascript
{
  "keypath": { $regex: /ion$/ }
}
```

**True:**
```javascript
{
  keypath: "diction"
}
```

**False:**
```javascript
{
  keypath: "dictionary"
}
```


### `$fn` operator

The `$fn` operator provides a mechanism for queries that are not supported by the other operators.  The `$fn` operator expects a function that returns a truey or falsey value.  This function should take a single argument - this argument will be the object currently being tested for a match.

**Given:**
```javascript
{
  "keypath": {
    $fn: function (obj) {
      if (obj.thing) {
        return _.isArray(obj.thing.deepThing);
      }
      return false;
    }
  }
}
```

**True:**
```javascript
{
  keypath: {
    thing: {
      deepThing: ["easy as", 1, 2, 3]
    }
  }
}
```

**False:**
```javascript
{
  keypath: "I have no thing property."
}
```

**False:**
```javascript
{
  keypath: {
    thing: {
      deepThing: "I am not an array."
    }
  }
}
```

If the function throws an error, this will be interpreted as a falsey response.  However, it is still considered best practice to protect against unnecessary and expensive exceptions, such as non-existent deep values in an object.


### `$eq` operator

In many situations, the `$eq` operator will provide little benefit.  The query `{ name: "Bob" }` behaves identically to `{ name: { $eq: "Bob" } }`

However, it will be very useful in certain circumstances.  For example, what if you are searching for an object that has a regular expression as a property?  If we were to query like so, `{ a: /er$/ }`, it wouldn't find an object whose `a` property equals `/er$/`.  It would find an object whose property matches the pattern.

`$eq` provides an alternative: `{ a: { $eq: /er$/ } }`.

Similarly, consider a situation where you are searching for an object with sub-property `$gte`.  If you were testing for equality, instead of `{ a: { $gte: 1 } }`, you could construct a query like so: `{ a: { $eq: { $gte: 1 } } }`.

Note that, at present, there is no mechanism to search for an object that has a property name matching one of the provided query operators.


-----

## Meta-data

For each object that Recollect stores, metadata related to that object is also stored.  You can access this metadata with the special keypath namespace `$meta`.  Standard operators can be used to query this metadata alongside any other conditions.

**Note:**  Because the `$meta` keypath is reserved by Recollect, you cannot use it to perform queries for objects that contain property `$meta`.


### `$meta.created` -> UTC timestamp

This is an integer representing the number of milliseconds since the epoch when the object was created.  It is set once, when the object is originally added to the object store.

It has no relation to corresponding backend records, should they exist, or the life-cycle of those records.

**Example:**

```javascript
{
  // find any records created on or before midnight on January 1, 1985
  "$meta.created": {
    $lte: 473414400000
  }
}
```


### `$meta.modified` -> UTC timestamp

This is an integer representing the number of milliseconds since the epoch when the object was last updated.  It is updated whenever a change is made.  If no change has ever been made, its value will be `null`.

**Example:**

```javascript
{
  // find any records modified after 16:45, February 5, 2014
  "$meta.modified": {
    $gt: new Date(2014, 1, 5, 16, 45).getTime()
  }
}
```


-----

## Errors

The following error prototypes are available as properties on `Recollect.Errors`.  They  are thrown (or provided as the `reject`-ed value) in the indicated circumstances.

| Error name           | Description                                                    |
| -----                | -----                                                          |
| ObjectNotFoundError  | Thrown on `replace` if object with `keyPath` is not found.     |
| IndexedDbNotFound    | Thrown if IndexedDB is unsupported in browser.                 |
| ConnectionError      | Thrown upon failure to open database.                          |
| CursorError          | Thrown upon unexpected condition while iterating over records. |
| InvalidArgumentError | Thrown if required options not provided or invalid.            |
| TransactionError     | Thrown upon unexpected condition while performing transaction. |
| InitializationError  | Thrown if initialization happens improperly or more than once. |

Oftentimes, additional information about the problem will be available on the error object as `err.message`.
