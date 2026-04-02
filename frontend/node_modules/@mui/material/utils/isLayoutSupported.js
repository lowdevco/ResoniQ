"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isLayoutSupported;
function isLayoutSupported() {
  return !(/jsdom|HappyDOM/.test(window.navigator.userAgent) ||
  // TODO(v9): Remove the test environment check
  // eslint-disable-next-line mui/consistent-production-guard
  process.env.NODE_ENV === 'test');
}