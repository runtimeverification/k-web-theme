const katex = require("katex");
const MarkdownIt = require("markdown-it");

/**
 * Parse math to svg
 * @param {string} content
 * @param {boolean} displayMode
 * @returns
 */
function parseMath(content, displayMode) {
  if (!content) {
    return "";
  }
  try {
    return katex.renderToString(
      content,
      Object.assign({}, /*configs.katexConfig ||*/ {}, { displayMode })
    );
  } catch (error) {
    return `<span style=\"color: #ee7f49; font-weight: 500;\">${error.toString()}</span>`;
  }
}

/**
 *
 * @param {MarkdownIt} md
 */
module.exports = function (md) {
  md.inline.ruler.before("escape", "math", (state, silent) => {
    let openTag = null;
    let closeTag = null;
    let displayMode = true;
    const inlineDelimiters = [["$", "$"]];
    const blockDelimiters = [["$$", "$$"]];

    for (const tagPair of blockDelimiters) {
      if (state.src.startsWith(tagPair[0], state.pos)) {
        [openTag, closeTag] = tagPair;
        break;
      }
    }

    if (!openTag) {
      for (const tagPair of inlineDelimiters) {
        if (state.src.startsWith(tagPair[0], state.pos)) {
          [openTag, closeTag] = tagPair;
          displayMode = false;
          break;
        }
      }
    }

    if (!openTag) {
      return false; // not math
    }

    let content = null;
    let end = -1;

    let i = state.pos + openTag.length;
    while (i < state.src.length) {
      if (state.src.startsWith(closeTag, i)) {
        end = i;
        break;
      } else if (state.src[i] === "\\") {
        i += 1;
      }
      i += 1;
    }

    if (end >= 0) {
      content = state.src.slice(state.pos + openTag.length, end);
    } else {
      return false;
    }

    if (content && !silent) {
      const token = state.push("math");
      token.content = content.trim();
      token.openTag = openTag;
      token.closeTag = closeTag;
      token.displayMode = displayMode;

      state.pos += content.length + openTag.length + closeTag.length;
      return true;
    } else {
      return false;
    }
  });

  md.renderer.rules.math = (tokens, idx) => {
    const content = tokens[idx] ? tokens[idx].content : null;
    return parseMath(content, tokens[idx].displayMode);
  };
};
