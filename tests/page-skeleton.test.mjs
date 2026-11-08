import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../src/components/ui/PageSkeleton.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const module = { exports: {} };
new Function("require", "module", "exports", compiled)(require, module, module.exports);
const { default: PageSkeleton, skeletonForPath } = module.exports;

const portalRoutes = {
  "/dashboard": "dashboard", "/videocursus": "video", "/flashcards": "flashcards",
  "/oefenexamens": "exam", "/cheat-sheet": "sheet",
  "/instellingen": "settings", "/voortgang": "coming-soon",
  "/admin": "admin-dashboard", "/admin/cursus": "admin-editor",
  "/admin/oefenexamens": "admin-editor", "/admin/cheat-sheet": "admin-editor",
  "/admin/flashcards": "admin-flashcards", "/admin/gebruikers": "users", "/admin/km-declaratie": "kilometers",
};

test("alle portalroutes hebben een passende routefallback en auth-skeleton", async () => {
  for (const [path, kind] of Object.entries(portalRoutes)) {
    const folder = path.startsWith("/admin") ? "(admin)" : "(platform)";
    const route = path.slice(1);
    const fallback = await readFile(new URL(`../src/app/${folder}/${route}/loading.tsx`, import.meta.url), "utf8");
    assert.match(fallback, new RegExp(`kind="${kind}"`), path);
    assert.equal(skeletonForPath(path), kind, path);
    const html = renderToStaticMarkup(React.createElement(PageSkeleton, { kind }));
    assert.match(html, /aria-label="Pagina laden"/, path);
    assert.match(html, /motion-reduce:animate-none/, path);
  }
});

test("de belangrijkste skeletons volgen de indeling van hun pagina", () => {
  const render = (kind) => renderToStaticMarkup(React.createElement(PageSkeleton, { kind }));
  assert.match(render("video"), /aspect-video/);
  assert.match(render("flashcards"), /h-\[28rem\]/);
  assert.match(render("users"), /Gegevens laden/);
  assert.match(render("admin-editor"), /380px/);
  assert.match(render("sheet"), /sm:grid-cols-2/);
});
