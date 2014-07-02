define(["./utils"], function (utils) {

  var errorFactory = function (name) {
    var ErrorType = function (message) {
      this.name = name;
      this.message = message;
      this.cause = message;

      if (message instanceof Error) {
        this.message = message.message;
        this.stack = message.stack;
      } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    };
    utils.inherit(ErrorType, Error);
    return ErrorType;
  };

  return {
    IndexedDbNotFound: errorFactory("IndexedDbNotFound"),
    ConnectionError: errorFactory("ConnectionError"),
    CursorError: errorFactory("CursorError"),
    DeletionError: errorFactory("DeletionError"),
    InvalidArgumentError: errorFactory("InvalidArgumentError"),
    UpdateError: errorFactory("UpdateError"),
    TransactionError: errorFactory("TransactionError"),
    InitializationError: errorFactory("InitializationError")
  };
});
