import * as utils from "src/utils";

describe("utils", () => {
  describe("getKeypathArray", () => {
    it("returns original value as single element when no delimiter found", () => {
      const arr = utils.getKeypathArray("rootLevel");
      expect(arr).to.be.an.array;
      expect(arr).to.eql(["rootLevel"]);
    });

    it("returns array of strings, as deparated by delimiter", () => {
      const arr = utils.getKeypathArray("goes.very.deep");
      expect(arr).to.have.length(3);
      expect(arr).to.eql(["goes", "very", "deep"]);
    });

    it("doesn't split on escaped delimiters", () => {
      const arr = utils.getKeypathArray("it.can.skip\\.escaped.delimiters");
      expect(arr).to.have.length(4);
      expect(arr).to.eql(["it", "can", "skip.escaped", "delimiters"]);
    });
  });

  describe("setDeepValue", () => {
    it("replaces an existing value", () => {
      const obj = {
        deep: {
          prop: "hello"
        }
      };
      utils.setDeepValue(obj, ["deep", "prop"], "works fine");

      expect(obj).to.have.deep.property("deep.prop", "works fine");
    });

    it("adds a previously non-existant property", () => {
      const obj = {
        deep: {}
      };
      utils.setDeepValue(obj, ["deep", "prop"], "works fine");

      expect(obj).to.have.deep.property("deep.prop", "works fine");
    });

    it("adds non-existant key-path nodes as objects", () => {
      const obj = {};
      utils.setDeepValue(obj, ["deep", "prop"], "works fine");
      utils.setDeepValue(obj, ["very", "very", "deep", "prop"], "works also");

      expect(obj).to.have.deep.property("deep.prop", "works fine");
      expect(obj).to.have.deep.property("very.very.deep.prop", "works also");
    });

    it("can traverse arrays", () => {
      const obj = {
        deep: [{}]
      };
      utils.setDeepValue(obj, ["deep", "0", "prop"], "should work");

      expect(obj).to.have.deep.property("deep[0].prop", "should work");
    });
  });
});
