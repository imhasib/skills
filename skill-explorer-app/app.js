(() => {
  const data = window.SKILL_DATA;
  if (!data) {
    document.body.innerHTML = '<div style="padding:32px;font-family:sans-serif">data.js not loaded. Run <code>node build.mjs</code> first.</div>';
    return;
  }

  // ---------- Configure marked + highlight.js ----------
  marked.setOptions({
    gfm: true,
    breaks: false,
    highlight(code, lang) {
      try {
        if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
        return hljs.highlightAuto(code).value;
      } catch { return code; }
    },
  });

  // ---------- Header ----------
  document.getElementById('skill-title').textContent = data.skillName;
  document.getElementById('skill-meta').textContent =
    `${data.files.length} markdown files · generated ${new Date(data.generatedAt).toLocaleString()}`;
  document.getElementById('file-count').textContent = `${data.files.length} files`;

  // ---------- Build tree structure ----------
  // Tree node: { name, path, children: Map, file: { path, content } | null }
  const tree = { name: data.skillName, path: '', children: new Map(), file: null };

  for (const file of data.files) {
    const parts = file.path.split('/');
    let node = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          children: new Map(),
          file: null,
        });
      }
      node = node.children.get(part);
      if (isLeaf) node.file = file;
    }
  }

  // ---------- Render tree ----------
  const treeEl = document.getElementById('tree');
  const filesByPath = new Map(data.files.map((f) => [f.path, f]));
  let selectedPath = null;

  function renderNode(node, depth = 0) {
    const ul = document.createElement('ul');
    const entries = [...node.children.values()].sort((a, b) => {
      const aDir = a.children.size > 0 && !a.file;
      const bDir = b.children.size > 0 && !b.file;
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const child of entries) {
      const isDir = child.children.size > 0 && !child.file;
      const li = document.createElement('li');
      li.className = isDir ? 'dir' : 'file';
      li.dataset.path = child.path;

      const row = document.createElement('div');
      row.className = 'row';
      row.style.paddingLeft = `${6 + depth * 12}px`;

      const chev = document.createElement('span');
      chev.className = 'chev';
      chev.textContent = isDir ? '▾' : '';
      row.appendChild(chev);

      const icon = document.createElement('span');
      icon.className = 'icon';
      icon.textContent = isDir ? '📁' : '📄';
      row.appendChild(icon);

      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = child.name;
      row.appendChild(name);

      li.appendChild(row);

      if (isDir) {
        const subUl = renderNode(child, depth + 1);
        li.appendChild(subUl);
        row.addEventListener('click', () => {
          subUl.classList.toggle('collapsed');
          chev.textContent = subUl.classList.contains('collapsed') ? '▸' : '▾';
        });
      } else {
        row.addEventListener('click', () => selectFile(child.path));
      }

      ul.appendChild(li);
    }
    return ul;
  }

  treeEl.appendChild(renderNode(tree));

  // ---------- Render content ----------
  const renderedEl = document.getElementById('rendered');
  const breadcrumbEl = document.getElementById('breadcrumb');

  function selectFile(path) {
    const file = filesByPath.get(path);
    if (!file) return;
    selectedPath = path;

    // Update selection styling
    treeEl.querySelectorAll('li.selected').forEach((el) => el.classList.remove('selected'));
    const li = treeEl.querySelector(`li[data-path="${CSS.escape(path)}"]`);
    if (li) {
      li.classList.add('selected');
      // Expand ancestors
      let parent = li.parentElement;
      while (parent && parent !== treeEl) {
        if (parent.tagName === 'UL') parent.classList.remove('collapsed');
        if (parent.tagName === 'LI') {
          const chev = parent.querySelector(':scope > .row > .chev');
          if (chev) chev.textContent = '▾';
        }
        parent = parent.parentElement;
      }
      li.scrollIntoView({ block: 'nearest' });
    }

    // Breadcrumb + copy button
    const parts = path.split('/');
    const crumbHtml = parts
      .map((p, i) => {
        const cls = i === parts.length - 1 ? 'crumb last' : 'crumb';
        return `<span class="${cls}">${escapeHtml(p)}</span>`;
      })
      .join('<span class="sep">/</span>');
    const fullPath = `bootstrap-project/${path}`;
    breadcrumbEl.innerHTML = `
      <span class="crumb-path">${crumbHtml}</span>
      <button class="copy-btn" type="button" title="Copy path: ${escapeHtml(fullPath)}" data-path="${escapeHtml(fullPath)}">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path fill="currentColor" d="M5 1.75A1.75 1.75 0 0 1 6.75 0h6.5A1.75 1.75 0 0 1 15 1.75v8.5A1.75 1.75 0 0 1 13.25 12H11v-1.5h2.25a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-6.5a.25.25 0 0 0-.25.25V4H5V1.75Z"/>
          <path fill="currentColor" d="M1 5.75C1 4.784 1.784 4 2.75 4h6.5C10.216 4 11 4.784 11 5.75v8.5A1.75 1.75 0 0 1 9.25 16h-6.5A1.75 1.75 0 0 1 1 14.25v-8.5Zm1.75-.25a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-6.5Z"/>
        </svg>
        <span class="copy-label">copy</span>
      </button>`;

    breadcrumbEl.querySelector('.copy-btn').addEventListener('click', async (ev) => {
      const btn = ev.currentTarget;
      const text = btn.dataset.path;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Fallback for older browsers / non-secure contexts
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      const label = btn.querySelector('.copy-label');
      const original = label.textContent;
      label.textContent = 'copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        label.textContent = original;
        btn.classList.remove('copied');
      }, 1200);
    });

    // Strip & display YAML frontmatter separately if present
    let { content } = file;
    let frontmatter = null;
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
    if (fmMatch) {
      frontmatter = fmMatch[1];
      content = content.slice(fmMatch[0].length);
    }

    const html = marked.parse(content);
    renderedEl.innerHTML = '';

    if (frontmatter) {
      const fm = document.createElement('div');
      fm.className = 'yaml-front';
      fm.textContent = frontmatter;
      renderedEl.appendChild(fm);
    }

    const body = document.createElement('div');
    body.innerHTML = html;
    renderedEl.appendChild(body);

    // Highlight any code blocks marked.js missed
    renderedEl.querySelectorAll('pre code').forEach((block) => {
      if (!block.classList.contains('hljs')) {
        try { hljs.highlightElement(block); } catch {}
      }
    });

    // Update URL hash for shareable links
    history.replaceState(null, '', `#${encodeURIComponent(path)}`);
    document.title = `${path} · ${data.skillName}`;

    renderedEl.parentElement.scrollTop = 0;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- Filter ----------
  const filterEl = document.getElementById('filter');
  filterEl.addEventListener('input', () => {
    const q = filterEl.value.trim().toLowerCase();
    treeEl.querySelectorAll('li').forEach((li) => li.classList.remove('hidden'));
    if (!q) return;

    // Hide leaves that don't match, then hide directories with no visible descendants
    treeEl.querySelectorAll('li.file').forEach((li) => {
      if (!li.dataset.path.toLowerCase().includes(q)) li.classList.add('hidden');
    });
    treeEl.querySelectorAll('li.dir').forEach((li) => {
      const anyVisible = li.querySelectorAll('li.file:not(.hidden)').length > 0;
      if (!anyVisible) li.classList.add('hidden');
      else {
        // Expand matching folders
        const sub = li.querySelector(':scope > ul');
        if (sub) sub.classList.remove('collapsed');
        const chev = li.querySelector(':scope > .row > .chev');
        if (chev) chev.textContent = '▾';
      }
    });
  });

  // ---------- Expand / collapse all ----------
  document.getElementById('expand-all').addEventListener('click', () => {
    treeEl.querySelectorAll('ul').forEach((ul) => ul.classList.remove('collapsed'));
    treeEl.querySelectorAll('li.dir > .row > .chev').forEach((c) => (c.textContent = '▾'));
  });
  document.getElementById('collapse-all').addEventListener('click', () => {
    treeEl.querySelectorAll('#tree > ul ul').forEach((ul) => ul.classList.add('collapsed'));
    treeEl.querySelectorAll('li.dir > .row > .chev').forEach((c) => (c.textContent = '▸'));
  });

  // ---------- Initial selection ----------
  const initial = decodeURIComponent(location.hash.slice(1));
  if (initial && filesByPath.has(initial)) selectFile(initial);
  else if (filesByPath.has('SKILL.md')) selectFile('SKILL.md');
  else if (data.files.length > 0) selectFile(data.files[0].path);
})();
