export function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.toLowerCase();
    if (!value || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

export function visibleTextFrom(root: ParentNode = document): string {
  const nodes = Array.from(root.querySelectorAll("main, section, article, h1, h2, h3, p, li, span"));
  return cleanText(nodes.map((node) => cleanText(node.textContent)).filter(Boolean).join(" "));
}

export function profileMainRoot(): ParentNode {
  return document.querySelector("main.scaffold-layout__main") ?? document.querySelector("main") ?? document;
}

export function textNearHeading(headingText: RegExp): string {
  const root = profileMainRoot();
  const headings = Array.from(root.querySelectorAll("section h2, section h3, section span[aria-hidden='true'], h2, h3"));
  const heading = headings.find((element) => headingText.test(cleanText(element.textContent)));
  if (!heading) {
    return "";
  }

  const section = heading.closest("section") as HTMLElement | null;
  if (!section) return "";
  return cleanText(section.innerText ?? section.textContent ?? "");
}
