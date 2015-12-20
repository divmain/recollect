const hasOwn = Object.prototype.hasOwnProperty;


function inherit (Child, Parent) {
  function Intermediate () {
    this.constructor = Child;
    this.constructor$ = Parent;
    for (const prop in Parent.prototype) {
      if (hasOwn.call(Parent.prototype, prop) && prop.slice(-1) !== "$") {
        this[`${prop}$`] = Parent.prototype[prop];
      }
    }
  }
  Intermediate.prototype = Parent.prototype;
  Child.prototype = new Intermediate();
  return Child.prototype;
}

export function errorFactory (name) {
  function ErrorType (message) {
    this.name = name;
    this.message = message;
    this.cause = message;

    if (message instanceof Error) {
      this.message = message.message;
      this.stack = message.stack;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  inherit(ErrorType, Error);
  return ErrorType;
}

export const ObjectNotFoundError = errorFactory("ObjectNotFoundError");
export const IndexedDbNotFound = errorFactory("IndexedDbNotFound");
export const ConnectionError = errorFactory("ConnectionError");
export const CursorError = errorFactory("CursorError");
export const InvalidArgumentError = errorFactory("InvalidArgumentError");
export const TransactionError = errorFactory("TransactionError");
export const InitializationError = errorFactory("InitializationError");
