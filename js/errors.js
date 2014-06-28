define([], function () {

  var IndexedDbNotFound = function (message) {
    var err = Error.apply(this, arguments);
    err.name = this.name = "IndexedDbNotFound";
    this.stack = err.stack;
    this.message = message || err.message || "";
    return this;
  };

  var ConnectionError = function (e) {
    var err = Error.apply(this, arguments);
    err.name = this.name = "ConnectionError";
    this.stack = err.stack;
    this.message = e;
    return this;
  };

  var CursorError = function (e) {
    var err = Error.apply(this, arguments);
    err.name = this.name = "CursorError";
    this.stack = err.stack;
    this.message = e;
    return this;
  };

  var DeletionError = function (e) {
    var err = Error.apply(this, arguments);
    err.name = this.name = "CursorError";
    this.stack = err.stack;
    this.message = e;
    return this;
  };

  var InvalidArgumentError = function (e) {
    var err = Error.apply(this, arguments);
    err.name = this.name = "InvalidArgumentError";
    this.stack = err.stack;
    this.message = e;
    return this;
  };

  var UpdateError = function (e) {
    var err = Error.apply(this, arguments);
    err.name = this.name = "UpdateError";
    this.stack = err.stack;
    this.message = e;
    return this;
  };

  var TransactionError = function (e) {
    var err = Error.apply(this, arguments);
    err.name = this.name = "TransactionError";
    this.stack = err.stack;
    this.message = e;
    return this;
  };

  var InitializationError = function (e) {
    var err = Error.apply(this, arguments);
    err.name = this.name = "TransactionError";
    this.stack = err.stack;
    this.message = e;
    return this;
  };

  return {
    IndexedDbNotFound: IndexedDbNotFound,
    ConnectionError: ConnectionError,
    CursorError: CursorError,
    DeletionError: DeletionError,
    InvalidArgumentError: InvalidArgumentError,
    UpdateError: UpdateError,
    TransactionError: TransactionError,
    InitializationError: InitializationError
  };
});
