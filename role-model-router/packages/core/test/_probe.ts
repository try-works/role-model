import { Data } from "effect";
export type S = Data.TaggedEnum<{ NoLadder: {}; Partial: { admitted: number } }>;
export const S = Data.taggedEnum<S>();
console.log(Object.keys(S));
const n = S.NoLadder;
console.log("NoLadder ctor:", typeof n);
try { console.log("NoLadder():", JSON.stringify(n())); } catch(e){ console.log("n() err", String(e)); }
try { console.log("NoLadder({}):", JSON.stringify(n({}))); } catch(e){ console.log("n({}) err", String(e)); }
console.log("Partial(1):", JSON.stringify(S.Partial({admitted:1})));
console.log("$match:", S.$match(S.NoLadder({}), { NoLadder: () => "none", Partial: () => "part" }));
