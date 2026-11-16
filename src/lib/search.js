const TYPE_WORDS = {
  note: "note notes",
  qb: "qb qbs question bank question banks",
  paper: "paper papers question paper previous year previous years prev year pyq pyqs model paper",
};

export const SEARCH_MIN_SCORE = 0.72;

export function normalizeText(value = "") {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSubsequence(needle, haystack) {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (needle[i] === haystack[j]) i++;
  }
  return i === needle.length;
}

function editDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d = Array.from({ length: rows }, (_, i) => {
    const row = new Array(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j < cols; j++) d[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
      }
    }
  }
  return d[a.length][b.length];
}

function splitTokenAtDigits(token) {
  const parts = [];
  let current = "";
  let prevWasDigit = null;

  for (const ch of token) {
    const isDigit = ch >= "0" && ch <= "9";
    if (prevWasDigit !== null && isDigit !== prevWasDigit && current) {
      parts.push(current);
      current = "";
    }
    current += ch;
    prevWasDigit = isDigit;
  }

  if (current) parts.push(current);
  return parts;
}

function normalizeNumbers(value) {
  return value.replace(/\d+/g, part => part.replace(/^0+(?=\d)/, ""));
}

function matchToken(token, words) {
  const compact = words.join("");
  if (!compact) return 0;

  if (token === compact) return 1;

  if (/^\d+$/.test(token) && words.length === 1) {
    const number = normalizeNumbers(token);
    const digitParts = splitTokenAtDigits(words[0])
      .filter(word => /^\d+$/.test(word))
      .map(normalizeNumbers);
    if (digitParts.includes(number)) return 1;
    return 0;
  }

  if (compact.startsWith(token)) return words.length === 1 ? 0.98 : 0.94;
  if (token.length >= 3 && compact.includes(token)) {
    return words.length === 1 ? 0.9 : 0.84;
  }

  if (words.length > 1) {
    const initials = words.map(word => word[0]).join("");
    if (token.length >= 3) {
      if (initials === token) return 0.97;
      if (initials.startsWith(token)) return 0.92;
      if (isSubsequence(token, initials)) return 0.7;
    }
  }

  if (words.length === 1 && words[0].length >= 3 && token.length >= 3 && /^[a-z]+$/.test(token)) {
    const word = words[0];
    const maxDistance = token.length >= 6 ? 2 : 1;
    const distance = editDistance(token, word);
    if (distance <= maxDistance) {
      return Math.max(0.55, 1 - distance / Math.max(token.length, word.length));
    }
  }

  return 0;
}

function scoreTokenCoverage(tokens, words) {
  if (!tokens.length || !words.length) return 0;

  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (let start = 0; start < words.length && best < 1; start++) {
      const maxLength = Math.min(4, words.length - start);
      for (let count = 1; count <= maxLength; count++) {
        const score = matchToken(token, words.slice(start, start + count));
        if (score > best) best = score;
        if (best === 1) break;
      }
    }
    if (!best) return 0;
    total += best;
  }

  return (total / tokens.length) * 0.97;
}

function scoreAcronym(compactQuery, words) {
  if (compactQuery.length < 3 || !words.length) return 0;

  const allowInsideWord = !/[0-9]/.test(compactQuery);
  let wordIndex = 0;
  let charIndex = 0;
  let initialMatches = 0;
  let total = 0;

  for (let i = 0; i < compactQuery.length; i++) {
    const ch = compactQuery[i];
    let matched = false;

    while (wordIndex < words.length) {
      const word = words[wordIndex];

      if (charIndex === 0) {
        if (word[0] === ch) {
          total += ch >= "0" && ch <= "9" && word !== ch ? 0.9 : 1;
          initialMatches++;
          charIndex = 1;
          matched = true;
          break;
        }
      } else if (allowInsideWord) {
        const foundAt = word.indexOf(ch, charIndex);
        const canMatchInside =
          initialMatches >= 2 ||
          word.length <= 2 ||
          foundAt === word.length - 1;
        if (foundAt !== -1 && canMatchInside) {
          total += Math.max(0.6, 1 - foundAt * 0.08);
          charIndex = foundAt + 1;
          matched = true;
          break;
        }
      }

      wordIndex++;
      charIndex = 0;
    }

    if (!matched) return 0;
  }

  return Math.min(0.95, (total / compactQuery.length) * 0.95);
}

export function scoreText(query, text) {
  const q = normalizeText(query);
  if (!q) return 0;

  const field = normalizeText(text);
  if (!field) return 0;

  const qCompact = q.replace(/ /g, "");
  const fieldCompact = field.replace(/ /g, "");
  const words = field.split(" ");
  const rawTokens = q.split(" ");
  const expandedTokens = rawTokens.flatMap(splitTokenAtDigits);

  let best = 0;
  if (field === q) best = 1;
  else if (field.startsWith(q)) best = 0.98;
  else if (q.length >= 3 && field.includes(q)) best = 0.92;

  if (qCompact.length >= 3 && fieldCompact.includes(qCompact)) {
    best = Math.max(best, 0.9);
  }

  best = Math.max(best, scoreTokenCoverage(rawTokens, words));
  best = Math.max(best, scoreTokenCoverage(expandedTokens, words));

  if (rawTokens.length === 1) {
    best = Math.max(best, scoreAcronym(qCompact, words));
  }

  if (qCompact.length >= 4 && isSubsequence(qCompact, fieldCompact)) {
    best = Math.max(best, 0.58);
  }

  return best;
}

export function scoreContent(query, item) {
  const titleScore = scoreText(query, item.title);
  const subjectNameScore = scoreText(query, item.subjects?.name);
  const subjectCodeScore = scoreText(query, item.subjects?.code);
  const typeScore = scoreText(query, TYPE_WORDS[item.type]);

  let score = Math.max(
    titleScore,
    subjectNameScore * 0.8,
    subjectCodeScore * 0.78,
    typeScore * 0.76
  );

  if (titleScore > 0 && (subjectNameScore > 0 || typeScore > 0)) score += 0.04;

  const tokens = normalizeText(query).split(" ").filter(Boolean);
  const expandedTokens = tokens.flatMap(splitTokenAtDigits);
  if (tokens.length > 1 || expandedTokens.length > 1) {
    const combined = [
      item.title,
      item.subjects?.name,
      item.subjects?.code,
      TYPE_WORDS[item.type],
    ].filter(Boolean).join(" ");
    score = Math.max(score, scoreText(query, combined) * 0.85);

    const fields = [
      { text: item.title, weight: 1 },
      { text: item.subjects?.name, weight: 0.8 },
      { text: TYPE_WORDS[item.type], weight: 0.76 },
    ];
    let crossTotal = 0;
    for (const token of expandedTokens) {
      let bestToken = 0;
      for (const field of fields) {
        bestToken = Math.max(bestToken, scoreText(token, field.text) * field.weight);
      }
      if (!bestToken) {
        crossTotal = 0;
        break;
      }
      crossTotal += bestToken;
    }
    if (crossTotal) {
      score = Math.max(score, (crossTotal / expandedTokens.length) * 0.97);
    }
  }

  return Math.min(score, 1);
}

export function scoreSubject(query, subject) {
  const nameScore = scoreText(query, subject.name);
  const codeScore = scoreText(query, subject.code);
  return Math.min(Math.max(nameScore, codeScore * 0.9), 1);
}
