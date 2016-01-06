import { default as getQueryFn, operators, constructCondition } from "../src/query";

describe("query", () => {
  describe("operators", () => {
    describe("$eq", () => {
      it("returns true for equivalent regular expressions", () => {
        expect(operators.$eq(/test/, /test/)).to.be.true;
      });

      it("returns false for non-equivalent regular expressions", () => {
        expect(operators.$eq(/test/, /not-the-same/)).to.be.false;
      });

      it("returns true for equivalent JS primitives", () => {
        expect(operators.$eq("is same", "is same")).to.be.true;
      });

      it("returns false for non-equivalent JS primitives", () => {
        expect(operators.$eq("is not", "the same")).to.be.false;
      });
    });

    describe("$gt", () => {
      it("returns true for value lexicographically greater than reference", () => {
        expect(operators.$gt(5, 3)).to.be.true;
        expect(operators.$gt("zoo", "apple")).to.be.true;
      });

      it("returns false for value lexicographically less than reference", () => {
        expect(operators.$gt(1, 10)).to.be.false;
        expect(operators.$gt("bear", "wiggle")).to.be.false;
      });

      it("returns false for value lexicographically equal to reference", () => {
        expect(operators.$gt(1, 1)).to.be.false;
        expect(operators.$gt("dog", "dog")).to.be.false;
      });
    });

    describe("$lt", () => {
      it("returns true for value lexicographically less than reference", () => {
        expect(operators.$lt(3, 5)).to.be.true;
        expect(operators.$lt("apple", "zoo")).to.be.true;
      });

      it("returns false for value lexicographically greater than reference", () => {
        expect(operators.$lt(10, 1)).to.be.false;
        expect(operators.$lt("wiggle", "bear")).to.be.false;
      });

      it("returns false for value lexicographically equal to reference", () => {
        expect(operators.$lt(1, 1)).to.be.false;
        expect(operators.$lt("dog", "dog")).to.be.false;
      });
    });

    describe("$gte", () => {
      it("returns true for value lexicographically greater than reference", () => {
        expect(operators.$gte(5, 3)).to.be.true;
        expect(operators.$gte("zoo", "apple")).to.be.true;
      });

      it("returns false for value lexicographically less than reference", () => {
        expect(operators.$gte(1, 10)).to.be.false;
        expect(operators.$gte("bear", "wiggle")).to.be.false;
      });

      it("returns true for value lexicographically equal to reference", () => {
        expect(operators.$gte(1, 1)).to.be.true;
        expect(operators.$gte("dog", "dog")).to.be.true;
      });
    });

    describe("$lte", () => {
      it("returns true for value lexicographically less than reference", () => {
        expect(operators.$lte(3, 5)).to.be.true;
        expect(operators.$lte("apple", "zoo")).to.be.true;
      });

      it("returns false for value lexicographically greater than reference", () => {
        expect(operators.$lte(10, 1)).to.be.false;
        expect(operators.$lte("wiggle", "bear")).to.be.false;
      });

      it("returns true for value lexicographically equal to reference", () => {
        expect(operators.$lte(1, 1)).to.be.true;
        expect(operators.$lte("dog", "dog")).to.be.true;
      });
    });

    describe("$neq", () => {
      it("returns true for value not equal to reference", () => {
        expect(operators.$neq("thing", "other thing")).to.be.true;
      });

      it("returns false for value equal to reference", () => {
        expect(operators.$neq("thing", "thing")).to.be.false;
      });
    });

    describe("$contains", () => {
      it("returns false for non-string value", () => {
        expect(operators.$contains(5, "thing")).to.be.false;
      });

      it("returns false for non-string reference value", () => {
        expect(operators.$contains("thing", true)).to.be.false;
      });

      it("returns false if value does not contain reference", () => {
        expect(operators.$contains("unrelated", "strings")).to.be.false;
      });

      it("returns true if value contains reference", () => {
        expect(operators.$contains("lots of things", "thing")).to.be.true;
      });
    });

    describe("$regex", () => {
      it("returns true if reference regex matches value", () => {
        expect(operators.$regex("3.1415", /[0-9]\.[0-9]+/)).to.be.true;
      });

      it("returns false if reference regex does not match value", () => {
        expect(operators.$regex("3.1415", /[0-2]\.[0-9]+/)).to.be.false;
        expect(operators.$regex("apple", /[0-2]\.[0-9]+/)).to.be.false;
        expect(operators.$regex({ not: "a string" }, /[0-2]\.[0-9]+/)).to.be.false;
      });
    });

    describe("$fn", () => {
      it("returns false if the function returns false", () => {
        expect(operators.$fn("some value", () => false)).to.be.false;
      });

      it("returns false if the function throws an exception", () => {
        expect(operators.$fn("some value", () => {
          throw new Error("oh no!");
        })).to.be.false;
      });

      it("returns true if the function returns true", () => {
        expect(operators.$fn("some value", () => true)).to.be.true;
      });
    });

    describe("$fnUnsafe", () => {
      it("returns whatever the function returns", () => {
        expect(operators.$fnUnsafe("some value", () => true)).to.be.true;
        expect(operators.$fnUnsafe("some value", () => false)).to.be.false;
      });

      it("will not catch exceptions", () => {
        expect(() => operators.$fnUnsafe("some value", () => {
          throw new Error("on no!");
        })).to.throw(Error);
      });
    });
  });

  describe("constructCondition", () => {
    it("returns $regex-equivalent for regex shorthand", () => {
      expect(constructCondition(/d+/)("dddd")).to.be.true;
      expect(constructCondition(/[0-9]\.[0-9]+/)("3.1415")).to.be.true;
      expect(constructCondition(/[0-2]\.[0-9]+/)("3.1415")).to.be.false;
    });

    it("returns $eq-equivalent for non-objects", () => {
      expect(constructCondition("dog")("dog")).to.be.true;
      expect(constructCondition("dog")("cat")).to.be.false;
    });

    it("returns $eq-equivalent for objects with non-operator keys", () => {
      expect(constructCondition({ $eq: "something", non: "operator" })({
        $eq: "something",
        non: "operator"
      })).to.be.true;
      expect(constructCondition({ $eq: "something", non: "operator" })({
        $eq: "something else",
        non: "operator"
      })).to.be.false;
    });

    it("returns a composite condition-function for objects with operator keys", () => {
      const conditionFn = constructCondition({
        $gt: 5,
        $lt: 20
      });

      expect(conditionFn(6)).to.be.true;
      expect(conditionFn(4)).to.be.false;
      expect(conditionFn("dog")).to.be.false;
    });
  });

  describe("getQueryFn", () => {

  });
});
