import { scoreContent, scoreSubject, SEARCH_MIN_SCORE } from "./lib/search";

const subject = {
  id: "s1",
  name: "Cloud Computing Technology",
  code: "24BECSE501",
};

const contents = [
  {
    id: "c1",
    title: "CCT Module 1 Notes",
    type: "note",
    subjects: subject,
  },
  {
    id: "c2",
    title: "CCT Module 2 Question Bank",
    type: "qb",
    subjects: subject,
  },
];

test("matches a document through its subject name", () => {
  expect(scoreContent("cloud computing", contents[0])).toBeGreaterThanOrEqual(SEARCH_MIN_SCORE);
});

test("prefers a specific module match", () => {
  const moduleOne = scoreContent("cct module 1", contents[0]);
  const moduleTwo = scoreContent("cct module 1", contents[1]);

  expect(moduleOne).toBeGreaterThan(moduleTwo);
});

test("matches a subject by acronym", () => {
  expect(scoreSubject("cct", subject)).toBeGreaterThanOrEqual(SEARCH_MIN_SCORE);
});

test("filters out unrelated searches", () => {
  expect(scoreContent("zzzzzz", contents[0])).toBeLessThan(SEARCH_MIN_SCORE);
});
