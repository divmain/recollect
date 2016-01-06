import * as utils from "src/utils";

describe("utils", () => {
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
