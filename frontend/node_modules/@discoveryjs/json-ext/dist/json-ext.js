(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.jsonExt = factory());
}(typeof globalThis != 'undefined' ? globalThis : typeof window != 'undefined' ? window : typeof global != 'undefined' ? global : typeof self != 'undefined' ? self : this, (function () {

// src/utils.js
function isIterable(value) {
  return typeof value === "object" && value !== null && (typeof value[Symbol.iterator] === "function" || typeof value[Symbol.asyncIterator] === "function");
}
function replaceValue(holder, key, value, replacer) {
  if (value && typeof value.toJSON === "function") {
    value = value.toJSON();
  }
  if (replacer !== null) {
    value = replacer.call(holder, String(key), value);
  }
  switch (typeof value) {
    case "function":
    case "symbol":
      value = void 0;
      break;
    case "object":
      if (value !== null) {
        const cls = value.constructor;
        if (cls === String || cls === Number || cls === Boolean) {
          value = value.valueOf();
        }
      }
      break;
  }
  return value;
}
function normalizeReplacer(replacer) {
  if (typeof replacer === "function") {
    return replacer;
  }
  if (Array.isArray(replacer)) {
    const allowlist = new Set(
      replacer.map((item) => {
        const cls = item && item.constructor;
        return cls === String || cls === Number ? String(item) : null;
      }).filter((item) => typeof item === "string")
    );
    return [...allowlist];
  }
  return null;
}
function normalizeSpace(space) {
  if (typeof space === "number") {
    if (!Number.isFinite(space) || space < 1) {
      return false;
    }
    return " ".repeat(Math.min(space, 10));
  }
  if (typeof space === "string") {
    return space.slice(0, 10) || false;
  }
  return false;
}
function normalizeStringifyOptions(optionsOrReplacer, space) {
  if (optionsOrReplacer === null || Array.isArray(optionsOrReplacer) || typeof optionsOrReplacer !== "object") {
    optionsOrReplacer = {
      replacer: optionsOrReplacer,
      space
    };
  }
  let replacer = normalizeReplacer(optionsOrReplacer.replacer);
  let getKeys = Object.keys;
  if (Array.isArray(replacer)) {
    const allowlist = replacer;
    getKeys = () => allowlist;
    replacer = null;
  }
  return {
    ...optionsOrReplacer,
    replacer,
    getKeys,
    space: normalizeSpace(optionsOrReplacer.space)
  };
}
function resolveStringifyMode(mode = "json") {
  if (mode === "json" || mode === "jsonl") {
    return mode;
  }
  throw new TypeError('Invalid options: `mode` should be "json" or "jsonl"');
}

// src/parse-chunked.js
var NO_VALUE = /* @__PURE__ */ Symbol("empty");
var STACK_OBJECT = 1;
var STACK_ARRAY = 2;
var MODE_JSON = 0;
var MODE_JSONL = 1;
var MODE_JSONL_AUTO = 2;
var decoder = new TextDecoder();
function adjustPosition(error, jsonParseOffset) {
  if (error.name === "SyntaxError" && jsonParseOffset) {
    error.message = error.message.replace(
      /at position (\d+)/,
      (_, pos) => "at position " + (Number(pos) + jsonParseOffset)
    );
  }
  return error;
}
function append(array, elements) {
  const initialLength = array.length;
  array.length += elements.length;
  for (let i = 0; i < elements.length; i++) {
    array[initialLength + i] = elements[i];
  }
}
function resolveParseMode(mode) {
  switch (mode) {
    case "json":
      return MODE_JSON;
    case "jsonl":
      return MODE_JSONL;
    case "auto":
      return MODE_JSONL_AUTO;
    default:
      throw new TypeError('Invalid options: `mode` should be "json", "jsonl", or "auto"');
  }
}
function parseChunkedOptions(value) {
  const options = typeof value === "function" ? { reviver: value } : value || {};
  return {
    mode: resolveParseMode(options.mode ?? "json"),
    reviver: options.reviver ?? null,
    onRootValue: options.onRootValue ?? null,
    onChunk: options.onChunk ?? null
  };
}
function applyReviver(value, reviver) {
  return walk({ "": value }, "", value);
  function walk(holder, key, value2) {
    if (value2 && typeof value2 === "object") {
      for (const childKey of Object.keys(value2)) {
        const childValue = value2[childKey];
        const newValue = walk(value2, childKey, childValue);
        if (newValue === void 0) {
          delete value2[childKey];
        } else if (newValue !== childValue) {
          value2[childKey] = newValue;
        }
      }
    }
    return reviver.call(holder, key, value2);
  }
}
async function parseChunked(chunkEmitter, optionsOrReviver) {
  const { mode, reviver, onRootValue, onChunk } = parseChunkedOptions(optionsOrReviver);
  const iterable = typeof chunkEmitter === "function" ? chunkEmitter() : chunkEmitter;
  if (isIterable(iterable)) {
    const parser = createChunkParser(mode, reviver, onRootValue, onChunk);
    try {
      for await (const chunk of iterable) {
        if (typeof chunk !== "string" && !ArrayBuffer.isView(chunk)) {
          throw new TypeError("Invalid chunk: Expected string, TypedArray or Buffer");
        }
        parser.push(chunk);
      }
      return parser.finish();
    } catch (e) {
      throw adjustPosition(e, parser.jsonParseOffset);
    }
  }
  throw new TypeError(
    "Invalid chunk emitter: Expected an Iterable, AsyncIterable, generator, async generator, or a function returning an Iterable or AsyncIterable"
  );
}
function createChunkParser(parseMode, reviver, onRootValue, onChunk) {
  let rootValues = parseMode === MODE_JSONL ? [] : null;
  let rootValuesCount = 0;
  let currentRootValue = NO_VALUE;
  let currentRootValueCursor = null;
  let consumedChunkLength = 0;
  let parsedChunkLength = 0;
  let prevArray = null;
  let prevArraySlices = [];
  let stack = new Array(100);
  let lastFlushDepth = 0;
  let flushDepth = 0;
  let stateString = false;
  let stateStringEscape = false;
  let seenNonWhiteSpace = false;
  let allowNewRootValue = true;
  let pendingByteSeq = null;
  let pendingChunk = null;
  let jsonParseOffset = 0;
  const state = Object.freeze({
    get mode() {
      return parseMode === MODE_JSONL ? "jsonl" : "json";
    },
    get rootValuesCount() {
      return rootValuesCount;
    },
    get consumed() {
      return consumedChunkLength;
    },
    get parsed() {
      return parsedChunkLength;
    }
  });
  return {
    push,
    finish,
    state,
    get jsonParseOffset() {
      return jsonParseOffset;
    }
  };
  function startRootValue(fragment) {
    if (!allowNewRootValue) {
      jsonParseOffset -= 2;
      JSON.parse("[]" + fragment);
    }
    if (currentRootValue !== NO_VALUE && parseMode === MODE_JSONL_AUTO) {
      parseMode = MODE_JSONL;
      rootValues = [currentRootValue];
    }
    allowNewRootValue = false;
    currentRootValue = JSON.parse(fragment);
  }
  function finishRootValue() {
    rootValuesCount++;
    if (typeof reviver === "function") {
      currentRootValue = applyReviver(currentRootValue, reviver);
    }
    if (typeof onRootValue === "function") {
      onRootValue(currentRootValue, state);
    } else if (parseMode === MODE_JSONL) {
      rootValues.push(currentRootValue);
    }
  }
  function mergeArraySlices() {
    if (prevArray === null) {
      return;
    }
    if (prevArraySlices.length !== 0) {
      const newArray = prevArraySlices.length === 1 ? prevArray.concat(prevArraySlices[0]) : prevArray.concat(...prevArraySlices);
      if (currentRootValueCursor.prev !== null) {
        currentRootValueCursor.prev.value[currentRootValueCursor.key] = newArray;
      } else {
        currentRootValue = newArray;
      }
      currentRootValueCursor.value = newArray;
      prevArraySlices = [];
    }
    prevArray = null;
  }
  function parseAndAppend(fragment, wrap) {
    if (stack[lastFlushDepth - 1] === STACK_OBJECT) {
      if (wrap) {
        jsonParseOffset--;
        fragment = "{" + fragment + "}";
      }
      Object.assign(currentRootValueCursor.value, JSON.parse(fragment));
    } else {
      if (wrap) {
        jsonParseOffset--;
        fragment = "[" + fragment + "]";
      }
      if (prevArray === currentRootValueCursor.value) {
        prevArraySlices.push(JSON.parse(fragment));
      } else {
        append(currentRootValueCursor.value, JSON.parse(fragment));
        prevArray = currentRootValueCursor.value;
      }
    }
  }
  function prepareAddition(fragment) {
    const { value } = currentRootValueCursor;
    const expectComma = Array.isArray(value) ? value.length !== 0 : Object.keys(value).length !== 0;
    if (expectComma) {
      if (fragment[0] === ",") {
        jsonParseOffset++;
        return fragment.slice(1);
      }
      if (fragment[0] !== "}" && fragment[0] !== "]") {
        jsonParseOffset -= 3;
        return "[[]" + fragment;
      }
    }
    return fragment;
  }
  function flush(chunk, start, end) {
    let fragment = chunk.slice(start, end);
    jsonParseOffset = consumedChunkLength + start;
    parsedChunkLength += end - start;
    if (pendingChunk !== null) {
      fragment = pendingChunk + fragment;
      jsonParseOffset -= pendingChunk.length;
      parsedChunkLength += pendingChunk.length;
      pendingChunk = null;
    }
    if (flushDepth === lastFlushDepth) {
      if (lastFlushDepth === 0) {
        startRootValue(fragment);
      } else {
        parseAndAppend(prepareAddition(fragment), true);
      }
    } else if (flushDepth > lastFlushDepth) {
      for (let i = flushDepth - 1; i >= lastFlushDepth; i--) {
        fragment += stack[i] === STACK_OBJECT ? "}" : "]";
      }
      if (lastFlushDepth === 0) {
        startRootValue(fragment);
        currentRootValueCursor = {
          value: currentRootValue,
          key: null,
          prev: null
        };
      } else {
        parseAndAppend(prepareAddition(fragment), true);
        mergeArraySlices();
      }
      for (let i = lastFlushDepth || 1; i < flushDepth; i++) {
        let { value } = currentRootValueCursor;
        let key = null;
        if (stack[i - 1] === STACK_OBJECT) {
          for (key in value) ;
          value = value[key];
        } else {
          key = value.length - 1;
          value = value[key];
        }
        currentRootValueCursor = {
          value,
          key,
          prev: currentRootValueCursor
        };
      }
    } else {
      fragment = prepareAddition(fragment);
      for (let i = lastFlushDepth - 1; i >= flushDepth; i--) {
        jsonParseOffset--;
        fragment = (stack[i] === STACK_OBJECT ? "{" : "[") + fragment;
      }
      parseAndAppend(fragment, false);
      mergeArraySlices();
      for (let i = lastFlushDepth - 1; i >= flushDepth; i--) {
        currentRootValueCursor = currentRootValueCursor.prev;
      }
    }
    if (flushDepth === 0) {
      finishRootValue();
    }
    lastFlushDepth = flushDepth;
    seenNonWhiteSpace = false;
  }
  function ensureChunkString(chunk) {
    if (typeof chunk !== "string") {
      if (pendingByteSeq !== null) {
        const origRawChunk = chunk;
        chunk = new Uint8Array(pendingByteSeq.length + origRawChunk.length);
        chunk.set(pendingByteSeq);
        chunk.set(origRawChunk, pendingByteSeq.length);
        pendingByteSeq = null;
      }
      if (chunk[chunk.length - 1] > 127) {
        for (let seqLength = 0; seqLength < chunk.length; seqLength++) {
          const byte = chunk[chunk.length - 1 - seqLength];
          if (byte >> 6 === 3) {
            seqLength++;
            if (seqLength !== 4 && byte >> 3 === 30 || seqLength !== 3 && byte >> 4 === 14 || seqLength !== 2 && byte >> 5 === 6) {
              pendingByteSeq = chunk.slice(chunk.length - seqLength);
              chunk = chunk.subarray(0, -seqLength);
            }
            break;
          }
        }
      }
      chunk = decoder.decode(chunk);
    }
    return chunk;
  }
  function push(chunk) {
    chunk = ensureChunkString(chunk);
    const chunkLength = chunk.length;
    const prevParsedChunkLength = parsedChunkLength;
    let lastFlushPoint = 0;
    let flushPoint = 0;
    scan: for (let i = 0; i < chunkLength; i++) {
      if (stateString) {
        for (; i < chunkLength; i++) {
          if (stateStringEscape) {
            stateStringEscape = false;
          } else {
            switch (chunk.charCodeAt(i)) {
              case 34:
                stateString = false;
                continue scan;
              case 92:
                stateStringEscape = true;
            }
          }
        }
        break;
      }
      switch (chunk.charCodeAt(i)) {
        case 34:
          stateString = true;
          stateStringEscape = false;
          seenNonWhiteSpace = true;
          break;
        case 44:
          flushPoint = i;
          break;
        case 123:
          flushPoint = i + 1;
          stack[flushDepth++] = STACK_OBJECT;
          seenNonWhiteSpace = true;
          break;
        case 91:
          flushPoint = i + 1;
          stack[flushDepth++] = STACK_ARRAY;
          seenNonWhiteSpace = true;
          break;
        case 93:
        /* ] */
        case 125:
          flushPoint = i + 1;
          if (flushDepth === 0) {
            break scan;
          }
          flushDepth--;
          if (flushDepth < lastFlushDepth) {
            flush(chunk, lastFlushPoint, flushPoint);
            lastFlushPoint = flushPoint;
          }
          break;
        case 9:
        /* \t */
        case 10:
        /* \n */
        case 13:
        /* \r */
        case 32:
          if (flushDepth === 0) {
            if (seenNonWhiteSpace) {
              flushPoint = i;
              flush(chunk, lastFlushPoint, flushPoint);
              lastFlushPoint = flushPoint;
            }
            if (parseMode !== MODE_JSON && allowNewRootValue === false && (chunk.charCodeAt(i) === 10 || chunk.charCodeAt(i) === 13)) {
              allowNewRootValue = true;
            }
            if (flushPoint === i) {
              parsedChunkLength++;
            }
          }
          if (lastFlushPoint === i) {
            lastFlushPoint++;
          }
          if (flushPoint === i) {
            flushPoint++;
          }
          break;
        default:
          seenNonWhiteSpace = true;
      }
    }
    if (flushPoint > lastFlushPoint) {
      flush(chunk, lastFlushPoint, flushPoint);
    }
    if (flushPoint < chunkLength) {
      if (pendingChunk !== null) {
        pendingChunk += chunk;
      } else {
        pendingChunk = chunk.slice(flushPoint, chunkLength);
      }
    }
    consumedChunkLength += chunkLength;
    if (typeof onChunk === "function") {
      onChunk(parsedChunkLength - prevParsedChunkLength, chunk, pendingChunk, state);
    }
  }
  function finish() {
    if (pendingChunk !== null || currentRootValue === NO_VALUE && parseMode !== MODE_JSONL) {
      flushDepth = 0;
      flush("", 0, 0);
    }
    if (typeof onChunk === "function") {
      parsedChunkLength = consumedChunkLength;
      onChunk(0, null, null, state);
    }
    if (typeof onRootValue === "function") {
      return rootValuesCount;
    }
    return rootValues !== null ? rootValues : currentRootValue;
  }
}

// src/stringify-chunked.js
function encodeString(value) {
  if (/[^\x20\x21\x23-\x5B\x5D-\uD799]/.test(value)) {
    return JSON.stringify(value);
  }
  return '"' + value + '"';
}
function* stringifyChunked(value, ...args) {
  const { replacer, getKeys, space, ...options } = normalizeStringifyOptions(...args);
  const highWaterMark = Number(options.highWaterMark) || 16384;
  const roots = resolveStringifyMode(options.mode) === "jsonl" && Array.isArray(value) ? value : [value];
  const rootCount = roots.length;
  const keyStrings = /* @__PURE__ */ new Map();
  const stack = [];
  let rootValue = null;
  let prevState = null;
  let state = null;
  let stateValue = null;
  let stateEmpty = true;
  let stateKeys = [];
  let stateIndex = 0;
  let buffer = "";
  for (let i = 0; i < rootCount; i++) {
    if (rootValue !== null) {
      buffer += "\n";
    }
    rootValue = { "": roots[i] };
    prevState = null;
    state = () => printEntry("", roots[i]);
    stateValue = rootValue;
    stateEmpty = true;
    stateKeys = [""];
    stateIndex = 0;
    do {
      state();
      if (buffer.length >= highWaterMark || prevState === null && i === rootCount - 1) {
        yield buffer;
        buffer = "";
      }
    } while (prevState !== null);
  }
  function printObject() {
    if (stateIndex === 0) {
      stateKeys = getKeys(stateValue);
      buffer += "{";
    }
    if (stateIndex === stateKeys.length) {
      buffer += space && !stateEmpty ? `
${space.repeat(stack.length - 1)}}` : "}";
      popState();
      return;
    }
    const key = stateKeys[stateIndex++];
    printEntry(key, stateValue[key]);
  }
  function printArray() {
    if (stateIndex === 0) {
      buffer += "[";
    }
    if (stateIndex === stateValue.length) {
      buffer += space && !stateEmpty ? `
${space.repeat(stack.length - 1)}]` : "]";
      popState();
      return;
    }
    printEntry(stateIndex, stateValue[stateIndex++]);
  }
  function printEntryPrelude(key) {
    if (stateEmpty) {
      stateEmpty = false;
    } else {
      buffer += ",";
    }
    if (space && prevState !== null) {
      buffer += `
${space.repeat(stack.length)}`;
    }
    if (state === printObject) {
      let keyString = keyStrings.get(key);
      if (keyString === void 0) {
        keyStrings.set(key, keyString = encodeString(key) + (space ? ": " : ":"));
      }
      buffer += keyString;
    }
  }
  function printEntry(key, value2) {
    value2 = replaceValue(stateValue, key, value2, replacer);
    if (value2 === null || typeof value2 !== "object") {
      if (state !== printObject || value2 !== void 0) {
        printEntryPrelude(key);
        pushPrimitive(value2);
      }
    } else {
      if (stack.includes(value2)) {
        throw new TypeError("Converting circular structure to JSON");
      }
      printEntryPrelude(key);
      stack.push(value2);
      pushState();
      state = Array.isArray(value2) ? printArray : printObject;
      stateValue = value2;
      stateEmpty = true;
      stateIndex = 0;
    }
  }
  function pushPrimitive(value2) {
    switch (typeof value2) {
      case "string":
        buffer += encodeString(value2);
        break;
      case "number":
        buffer += Number.isFinite(value2) ? String(value2) : "null";
        break;
      case "boolean":
        buffer += value2 ? "true" : "false";
        break;
      case "undefined":
      case "object":
        buffer += "null";
        break;
      default:
        throw new TypeError(`Do not know how to serialize a ${value2.constructor?.name || typeof value2}`);
    }
  }
  function pushState() {
    prevState = {
      keys: stateKeys,
      index: stateIndex,
      prev: prevState
    };
  }
  function popState() {
    stack.pop();
    const value2 = stack.length > 0 ? stack[stack.length - 1] : rootValue;
    state = Array.isArray(value2) ? printArray : printObject;
    stateValue = value2;
    stateEmpty = false;
    stateKeys = prevState.keys;
    stateIndex = prevState.index;
    prevState = prevState.prev;
  }
}

// src/stringify-info.js
var hasOwn = typeof Object.hasOwn === "function" ? Object.hasOwn : (object, key) => Object.hasOwnProperty.call(object, key);
var escapableCharCodeSubstitution = {
  // JSON Single Character Escape Sequences
  8: "\\b",
  9: "\\t",
  10: "\\n",
  12: "\\f",
  13: "\\r",
  34: '\\"',
  92: "\\\\"
};
var charLength2048 = Uint8Array.from({ length: 2048 }, (_, code) => {
  if (hasOwn(escapableCharCodeSubstitution, code)) {
    return 2;
  }
  if (code < 32) {
    return 6;
  }
  return code < 128 ? 1 : 2;
});
function isLeadingSurrogate(code) {
  return code >= 55296 && code <= 56319;
}
function isTrailingSurrogate(code) {
  return code >= 56320 && code <= 57343;
}
function stringLength(str) {
  if (!/[^\x20\x21\x23-\x5B\x5D-\x7F]/.test(str)) {
    return str.length + 2;
  }
  let len = 0;
  let prevLeadingSurrogate = false;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 2048) {
      len += charLength2048[code];
    } else if (isLeadingSurrogate(code)) {
      len += 6;
      prevLeadingSurrogate = true;
      continue;
    } else if (isTrailingSurrogate(code)) {
      len = prevLeadingSurrogate ? len - 2 : len + 6;
    } else {
      len += 3;
    }
    prevLeadingSurrogate = false;
  }
  return len + 2;
}
function intLength(num) {
  let len = 0;
  if (num < 0) {
    len = 1;
    num = -num;
  }
  if (num >= 1e9) {
    len += 9;
    num = (num - num % 1e9) / 1e9;
  }
  if (num >= 1e4) {
    if (num >= 1e6) {
      return len + (num >= 1e8 ? 9 : num >= 1e7 ? 8 : 7);
    }
    return len + (num >= 1e5 ? 6 : 5);
  }
  return len + (num >= 100 ? num >= 1e3 ? 4 : 3 : num >= 10 ? 2 : 1);
}
function primitiveLength(value) {
  switch (typeof value) {
    case "string":
      return stringLength(value);
    case "number":
      return Number.isFinite(value) ? Number.isInteger(value) ? intLength(value) : String(value).length : 4;
    case "boolean":
      return value ? 4 : 5;
    case "undefined":
    case "object":
      return 4;
    /* null */
    default:
      return 0;
  }
}
function stringifyInfo(value, ...args) {
  const { replacer, getKeys, ...options } = normalizeStringifyOptions(...args);
  const continueOnCircular = Boolean(options.continueOnCircular);
  const space = options.space?.length || 0;
  const roots = resolveStringifyMode(options.mode) === "jsonl" && Array.isArray(value) ? value : [value];
  const keysLength = /* @__PURE__ */ new Map();
  const visited = /* @__PURE__ */ new Map();
  const circular = /* @__PURE__ */ new Set();
  const stack = [];
  let stop = false;
  let bytes = 0;
  let spaceBytes = 0;
  let objects = 0;
  for (let i = 0; i < roots.length; i++) {
    if (i > 0) {
      bytes += 1;
    }
    walk({ "": roots[i] }, "", roots[i]);
  }
  if (bytes === 0 && roots.length === 1) {
    bytes += 9;
  }
  return {
    bytes: isNaN(bytes) ? Infinity : bytes + spaceBytes,
    spaceBytes: space > 0 && isNaN(bytes) ? Infinity : spaceBytes,
    circular: [...circular]
  };
  function walk(holder, key, value2) {
    if (stop) {
      return;
    }
    value2 = replaceValue(holder, key, value2, replacer);
    if (value2 === null || typeof value2 !== "object") {
      if (value2 !== void 0 || Array.isArray(holder)) {
        bytes += primitiveLength(value2);
      }
    } else {
      if (stack.includes(value2)) {
        circular.add(value2);
        bytes += 4;
        if (!continueOnCircular) {
          stop = true;
        }
        return;
      }
      if (visited.has(value2)) {
        bytes += visited.get(value2);
        return;
      }
      objects++;
      const prevObjects = objects;
      const valueBytes = bytes;
      let valueLength = 0;
      stack.push(value2);
      if (Array.isArray(value2)) {
        valueLength = value2.length;
        for (let i = 0; i < valueLength; i++) {
          walk(value2, i, value2[i]);
        }
      } else {
        let prevLength = bytes;
        for (const key2 of getKeys(value2)) {
          walk(value2, key2, value2[key2]);
          if (prevLength !== bytes) {
            let keyLen = keysLength.get(key2);
            if (keyLen === void 0) {
              keysLength.set(key2, keyLen = stringLength(key2) + 1);
            }
            bytes += keyLen;
            valueLength++;
            prevLength = bytes;
          }
        }
      }
      bytes += valueLength === 0 ? 2 : 1 + valueLength;
      if (space > 0 && valueLength > 0) {
        spaceBytes += // a space between ":" and a value for each object entry
        (Array.isArray(value2) ? 0 : valueLength) + // the formula results from folding the following components:
        // - for each key-value or element: ident + newline
        //   (1 + stack.length * space) * valueLength
        // - ident (one space less) before "}" or "]" + newline
        //   (stack.length - 1) * space + 1
        (1 + stack.length * space) * (valueLength + 1) - space;
      }
      stack.pop();
      if (prevObjects !== objects) {
        visited.set(value2, bytes - valueBytes);
      }
    }
  }
}

// src/web-streams.js
function parseFromWebStream(stream) {
  return parseChunked(isIterable(stream) ? stream : async function* () {
    const reader = stream.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  });
}
function createStringifyWebStream(value, replacer, space) {
  if (typeof ReadableStream.from === "function") {
    return ReadableStream.from(stringifyChunked(value, replacer, space));
  }
  return new ReadableStream({
    start() {
      this.generator = stringifyChunked(value, replacer, space);
    },
    pull(controller) {
      const { value: value2, done } = this.generator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value2);
      }
    },
    cancel() {
      this.generator = null;
    }
  });
}
return {
  createStringifyWebStream,
  parseChunked,
  parseFromWebStream,
  stringifyChunked,
  stringifyInfo
};

})));
