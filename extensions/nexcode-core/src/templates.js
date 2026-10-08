'use strict';
// Project templates. Each returns { files: { 'relative/path': 'content' }, open: 'file to open' }.

function web(t) {
  return {
    open: 'index.html',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexCode</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <h1 id="title">${t('tplHello')}</h1>
    <p>${t('tplComment')}</p>
    <button id="btn">Click me</button>
  </main>
  <script src="script.js"></script>
</body>
</html>
`,
      'style.css': `* { box-sizing: border-box; }
body {
  margin: 0; min-height: 100vh; display: grid; place-items: center;
  font-family: "Segoe UI", Tahoma, sans-serif;
  background: linear-gradient(135deg, #0b1224, #2e1e6e); color: #fff; text-align: center;
}
button {
  padding: .7rem 1.4rem; border: 0; border-radius: .6rem; font-size: 1rem; cursor: pointer;
  background: linear-gradient(90deg, #19c2ff, #8b5cf6); color: #fff;
}
`,
      'script.js': `document.getElementById('btn').addEventListener('click', () => {
  document.getElementById('title').textContent = 'NexCode ✨';
});
`
    }
  };
}

function webRtl(t) {
  return {
    open: 'index.html',
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>موقعي</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>${t('tplHello')}</h1>
    <p>${t('tplComment')}</p>
  </header>
  <section class="cards">
    <article><h2>من نحن</h2><p>اكتب هنا نبذة عنك.</p></article>
    <article><h2>خدماتنا</h2><p>اكتب هنا خدماتك.</p></article>
    <article><h2>تواصل معنا</h2><p>اكتب هنا وسائل التواصل.</p></article>
  </section>
</body>
</html>
`,
      'style.css': `/* الاتجاه من اليمين لليسار يتحدد من dir="rtl" في وسم html */
* { box-sizing: border-box; }
body { margin: 0; font-family: Tahoma, "Segoe UI", sans-serif; background: #f5f7fb; color: #1b2340; }
header { padding: 3rem 1rem; text-align: center; color: #fff; background: linear-gradient(135deg, #19c2ff, #8b5cf6); }
.cards { display: grid; gap: 1rem; padding: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
article { background: #fff; padding: 1.2rem; border-radius: .8rem; box-shadow: 0 2px 10px rgba(0,0,0,.08); }
`
    }
  };
}

function python(t) {
  return {
    open: 'main.py',
    files: {
      'main.py': `# ${t('tplComment')}
def main():
    name = input("What is your name? ")
    print(f"${t('tplHello')} {name}")


if __name__ == "__main__":
    main()
`,
      'README.md': '# Python project\n\nRun with the ▶ button or Ctrl+Shift+F10.\n'
    }
  };
}

function node(t, name) {
  return {
    open: 'index.js',
    files: {
      'package.json': JSON.stringify({ name: name.toLowerCase(), version: '1.0.0', main: 'index.js', scripts: { start: 'node index.js' }, license: 'MIT' }, null, 2) + '\n',
      'index.js': `// ${t('tplComment')}
const message = '${t('tplHello').replace(/'/g, "\\'")}';
console.log(message);
`
    }
  };
}

function cpp(t) {
  return {
    open: 'main.cpp',
    files: {
      'main.cpp': `// ${t('tplComment')}
#include <iostream>

int main() {
    std::cout << "Hello from NexCode!" << std::endl;
    return 0;
}
`
    }
  };
}

function c(t) {
  return {
    open: 'main.c',
    files: {
      'main.c': `/* ${t('tplComment')} */
#include <stdio.h>

int main(void) {
    printf("Hello from NexCode!\\n");
    return 0;
}
`
    }
  };
}

function java(t) {
  return {
    open: 'Main.java',
    files: {
      'Main.java': `// ${t('tplComment')}
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from NexCode!");
    }
}
`
    }
  };
}

const LIST = [
  { id: 'web', label: '$(globe) Web — HTML / CSS / JavaScript', make: web },
  { id: 'web-rtl', label: '$(globe) Web — عربي RTL', make: webRtl },
  { id: 'python', label: '$(symbol-misc) Python', make: python },
  { id: 'node', label: '$(symbol-event) Node.js', make: node },
  { id: 'cpp', label: '$(symbol-class) C++', make: cpp },
  { id: 'c', label: '$(symbol-struct) C', make: c },
  { id: 'java', label: '$(coffee) Java', make: java }
];

module.exports = { LIST };
