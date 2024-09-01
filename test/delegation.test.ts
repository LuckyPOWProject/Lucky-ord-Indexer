import chai from "chai";
import DecodeInputScript from "../src/utils/decode-input-script";

const txInput = [
  {
    vin: 0,
    sequence: 4294967295,
    index: 0,
    txid: "39aff00b65a07aaa64ae14bf45286569d32548d2512d6ce18dc87fdf704507d7",
    script:
      "036f7264510000005b20457bc227fede561c0c075dfbe830b2e4959ce21370f197183ef3aba5102c593c47304402204f7269cd6e63172b9415036ae1ef7addd3eb98754447923862dd58dd7bc0234f022057edb596225acde5689529bd1a46281e698558079c84dd8fb83897b7e225d6f0012b2103a2604d101df766784c11ee948aed4c997e35786d8679d872ac149e23cc486b4dad7575757575757551",
  },
];

describe("Should be valid delegation", () => {
  it("Check delegation", async () => {
    const decodeInput = DecodeInputScript(txInput)[0].delegation_txid!;
    chai
      .expect(decodeInput)
      .equal(
        "3c592c10a5abf33e1897f17013e29c95e4b230e8fb5d070c1c56defe27c27b45"
      );
  });
});
