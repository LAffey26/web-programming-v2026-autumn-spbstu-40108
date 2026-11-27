import {BlogPost} from './model.js';

const storageKey = 'lab4-blog-posts';
const list = document.querySelector('[data-testid="entity-list"]');
const postForm = document.querySelector('[data-testid="entity-form"]');
const error = document.querySelector('[data-error]');
const count = document.querySelector('[data-count]');
const empty = document.querySelector('[data-empty]');

function loadPosts() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(saved)) {
      return [];
    }
    return saved.map(
      (post) =>
        new BlogPost(
          post.id,
          post.title,
          post.tags,
          post.comments,
          post.content,
        ),
    );
  } catch {
    return [];
  }
}

let posts = loadPosts();
let pending = Promise.resolve();
const openPosts = new Set();
const editDrafts = new Map();

function nextPostId() {
  return posts.reduce((max, post) => Math.max(max, post.id), 0) + 1;
}

function update(action) {
  pending = pending.then(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          try {
            error.textContent = '';
            action();
            localStorage.setItem(storageKey, JSON.stringify(posts));
            render();
          } catch (problem) {
            error.textContent = problem.message;
          }
          resolve();
        }, 100);
      }),
  );
}

function makeElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text) {
    element.textContent = text;
  }
  if (className) {
    element.className = className;
  }
  return element;
}

function makeInput(name, labelText) {
  const label = makeElement('label', labelText);
  const input = document.createElement('input');
  input.name = name;
  input.type = 'text';
  input.required = true;
  label.append(input);
  return label;
}

function makeButton(text, action) {
  const button = makeElement('button', text);
  button.type = 'button';
  button.dataset.action = action;
  return button;
}

function render() {
  list.replaceChildren();
  count.textContent = posts.length;
  empty.hidden = posts.length > 0;

  for (const post of posts) {
    const card = makeElement('article', '', 'post-card');
    card.dataset.testid = 'entity-card';
    card.dataset.id = post.id;
    const details = makeElement('details', '', 'post-details');
    details.open = openPosts.has(post.id);
    details.addEventListener('toggle', () => {
      if (details.open) {
        openPosts.add(post.id);
      } else {
        openPosts.delete(post.id);
      }
    });
    const draft = editDrafts.get(post.id);
    const summary = makeElement('summary', '', 'post-summary');
    const heading = makeElement('div', '', 'card-title');
    heading.append(makeElement('p', `ПОСТ №${post.id}`, 'post-number'));
    heading.append(makeElement('h2', post.title));
    const headerTags = makeElement('ul', '', 'tags header-tags');
    if (!draft) {
      for (const tag of post.tags) {
        headerTags.append(makeElement('li', `#${tag}`));
      }
    }
    heading.append(headerTags);
    heading.append(
      makeElement('p', `Комментарии: ${post.commentCount}`, 'post-meta'),
    );
    const openLabel = makeElement(
      'span',
      details.open ? 'Свернуть' : 'Открыть',
      'open-label',
    );
    details.addEventListener('toggle', () => {
      openLabel.textContent = details.open ? 'Свернуть' : 'Открыть';
    });
    summary.append(heading, openLabel);
    details.append(summary);
    if (draft) {
      const tags = makeElement('ul', '', 'tags editing-tags');
      for (const tag of draft.tags) {
        const item = makeElement('li');
        item.append(makeElement('span', `#${tag}`));
        const removeTag = makeButton('×', 'remove-tag');
        removeTag.dataset.tag = tag;
        removeTag.className = 'remove-tag';
        removeTag.setAttribute('aria-label', `Удалить тег ${tag}`);
        item.append(removeTag);
        tags.append(item);
      }
      const addItem = makeElement('li', '', 'add-tag-item');
      const addButton = makeElement(
        'button',
        '+ Добавить тег',
        'add-tag-button',
      );
      addButton.type = 'button';
      const tagForm = makeElement('form', '', 'tag-form');
      tagForm.dataset.action = 'add-tag';
      tagForm.hidden = true;
      const tagInput = document.createElement('input');
      tagInput.name = 'tag';
      tagInput.placeholder = 'Название тега';
      tagInput.setAttribute('aria-label', 'Название тега');
      tagInput.required = true;
      const tagSubmit = makeElement('button', 'Добавить');
      tagSubmit.type = 'submit';
      tagForm.append(tagInput, tagSubmit);
      addButton.addEventListener('click', () => {
        addButton.hidden = true;
        tagForm.hidden = false;
        tagInput.focus();
      });
      addItem.append(addButton, tagForm);
      tags.append(addItem);
      details.append(tags);
    }
    const content = makeElement('div', '', 'post-content');
    if (draft) {
      const editForm = makeElement('form', '', 'edit-form');
      editForm.dataset.action = 'save-edit';
      const titleLabel = makeInput('title', 'Заголовок');
      titleLabel.querySelector('input').value = draft.title;
      const contentLabel = makeElement('label', 'Текст поста');
      const textArea = document.createElement('textarea');
      textArea.name = 'content';
      textArea.rows = 4;
      textArea.value = draft.content;
      contentLabel.append(textArea);
      const saveButton = makeElement(
        'button',
        'Сохранить изменения',
        'primary-button',
      );
      saveButton.type = 'submit';
      const cancelButton = makeButton('Отмена', 'cancel-edit');
      editForm.append(titleLabel, contentLabel, saveButton, cancelButton);
      content.append(editForm);
    } else {
      content.append(
        makeElement('p', post.content || 'Текст не добавлен.', 'post-text'),
      );
    }

    content.append(
      makeElement(
        'h3',
        `Комментарии · ${post.commentCount}`,
        'block-label comment-heading',
      ),
    );
    const comments = makeElement('ul', '', 'comments');
    for (const comment of post.comments) {
      const item = makeElement('li', '', 'comment');
      item.append(makeElement('strong', comment.author));
      item.append(makeElement('p', comment.text));
      comments.append(item);
    }
    if (post.comments.length === 0) {
      content.append(makeElement('p', 'Комментариев пока нет', 'hint'));
    }
    content.append(comments);

    const commentForm = makeElement('form', '', 'inline-form');
    commentForm.dataset.action = 'add-comment';
    commentForm.append(
      makeInput('author', 'Автор'),
      makeInput('text', 'Комментарий'),
    );
    const commentSubmit = makeElement('button', 'Добавить комментарий');
    commentSubmit.type = 'submit';
    commentForm.append(commentSubmit);
    content.append(commentForm);
    details.append(content);
    card.append(details);
    if (!draft) {
      const editButton = makeButton('Редактировать', 'edit-post');
      editButton.className = 'edit-post';
      card.append(editButton);
    }
    const deleteButton = makeButton('Удалить пост', 'delete-post');
    deleteButton.className = 'delete-post';
    deleteButton.dataset.testid = 'delete-entity';
    card.append(deleteButton);

    list.append(card);
  }
}

postForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(postForm);
  const title = String(data.get('title')).trim();
  const requestedId = String(data.get('id') || '').trim();
  const content = String(data.get('content') || '').trim();
  const tags = [
    ...new Set(
      String(data.get('tags') || '')
        .split(',')
        .map((tag) => tag.trim().replace(/^#+/, '').trim())
        .filter(Boolean),
    ),
  ];
  if (!title) {
    return;
  }
  update(() => {
    const id = requestedId ? Number(requestedId) : nextPostId();
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new Error('Введите положительный целый номер поста.');
    }
    if (posts.some((post) => post.id === id)) {
      throw new Error('Пост с таким номером уже существует.');
    }
    posts.push(new BlogPost(id, title, tags, [], content));
    postForm.reset();
  });
});

list.addEventListener('input', (event) => {
  const form = event.target.closest('form[data-action="save-edit"]');
  if (!form) {
    return;
  }
  const id = Number(form.closest('[data-testid="entity-card"]').dataset.id);
  const draft = editDrafts.get(id);
  if (
    draft &&
    (event.target.name === 'title' || event.target.name === 'content')
  ) {
    draft[event.target.name] = event.target.value;
  }
});

list.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const id = Number(form.closest('[data-testid="entity-card"]').dataset.id);
  const data = new FormData(form);
  const action = form.dataset.action;
  if (action === 'save-edit') {
    const title = String(data.get('title')).trim();
    const content = String(data.get('content') || '').trim();
    if (!title) {
      return;
    }
    update(() => {
      const post = posts.find((item) => item.id === id);
      const draft = editDrafts.get(id);
      if (!post || !draft) {
        return;
      }
      post.title = title;
      post.content = content;
      post.tags = [...draft.tags];
      editDrafts.delete(id);
    });
    return;
  }
  const tag = String(data.get('tag') || '')
    .trim()
    .replace(/^#+/, '')
    .trim();
  const author = String(data.get('author') || '').trim();
  const text = String(data.get('text') || '').trim();
  if (
    (action === 'add-tag' && !tag) ||
    (action === 'add-comment' && (!author || !text))
  ) {
    return;
  }
  update(() => {
    const post = posts.find((item) => item.id === id);
    if (!post) {
      return;
    }
    if (action === 'add-tag') {
      const draft = editDrafts.get(id);
      if (draft && !draft.tags.includes(tag)) {
        draft.tags.push(tag);
      }
    }
    if (action === 'add-comment') {
      post.addComment({author, text});
    }
  });
});

list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }
  const id = Number(button.closest('[data-testid="entity-card"]').dataset.id);
  const {action, tag} = button.dataset;
  if (action === 'edit-post') {
    const post = posts.find((item) => item.id === id);
    if (post) {
      editDrafts.set(id, {
        title: post.title,
        content: post.content,
        tags: [...post.tags],
      });
      openPosts.add(id);
      render();
    }
    return;
  }
  if (action === 'cancel-edit') {
    editDrafts.delete(id);
    render();
    return;
  }
  update(() => {
    if (action === 'delete-post') {
      posts = posts.filter((post) => post.id !== id);
      editDrafts.delete(id);
      openPosts.delete(id);
    }
    if (action === 'remove-tag') {
      const draft = editDrafts.get(id);
      if (draft) {
        draft.tags = draft.tags.filter((item) => item !== tag);
      }
    }
  });
});

render();
