/**
 * Content model (2 rows, 1 cell each):
 *   row 1: background image
 *   row 2: content (heading, text, buttons)
 * Authored elements are kept as-is; the rows only get semantic classes.
 * @param {Element} block the block
 */
export default function decorate(block) {
  const [media, content] = block.children;
  if (media) media.classList.add('hero-media');
  if (content) content.classList.add('hero-content');
}
