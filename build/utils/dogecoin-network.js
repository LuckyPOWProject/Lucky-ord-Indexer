"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dogecoinNetwork = void 0;
exports.dogecoinNetwork = {
    messagePrefix: "\x19Dogecoin Signed Message:\n",
    bech32: "bc",
    bip32: {
        public: 0x02facafd,
        private: 0x02fac398,
    },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e,
};
