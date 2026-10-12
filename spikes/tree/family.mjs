// The seeded "awkward family" from supabase/seed.sql, in the GEDCOM shape the
// app uses: people (INDI) + family units (FAM) with partner and child joins.
export const people = [
  { id: "earl",    name: "Earl",    gender: "M", deceased: true },
  { id: "mabel",   name: "Mabel",   gender: "F", deceased: true },
  { id: "james",   name: "James",   gender: "M", deceased: true },
  { id: "linda",   name: "Linda",   gender: "F" },
  { id: "dorothy", name: "Dorothy", gender: "F" },
  { id: "ruth",    name: "Ruth",    gender: "F" },
  { id: "walter",  name: "Walter",  gender: "M" },
  { id: "thomas",  name: "Thomas",  gender: "M" },
  { id: "kyle",    name: "Kyle",    gender: "M" },
  { id: "susan",   name: "Susan",   gender: "F" },
  { id: "carol",   name: "Carol",   gender: "F" },
  { id: "grace",   name: "Grace",   gender: "F" },
  { id: "emma",    name: "Emma",    gender: "F" },
  { id: "liam",    name: "Liam",    gender: "M" },
];

export const units = [
  { id: "f-earl-mabel",    partners: ["earl", "mabel"],    children: [["james"], ["ruth"]] },
  { id: "f-james-linda",   partners: ["james", "linda"],   children: [["thomas"]] },
  { id: "f-james-dorothy", partners: ["james", "dorothy"], children: [["kyle"], ["susan"]] },
  { id: "f-ruth-walter",   partners: ["ruth", "walter"],   children: [["grace", "adopted"]] },
  { id: "f-kyle-carol",    partners: ["kyle", "carol"],    children: [["emma"], ["liam"]] },
];

// The two shapes Gate 1 is about.
export const acceptance = {
  remarriage: { person: "james", units: ["f-james-linda", "f-james-dorothy"] },
  adoption:   { child: "grace", unit: "f-ruth-walter" },
};
