const fs = require('fs');
const path = require('path');

const reviews = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../edgewater_reviews_for_website.json'), 'utf8')
);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const stars = Array.from({ length: 5 })
  .map(
    () =>
      '        <span class="customer-review__star customer-review__star--filled" aria-hidden="true">★</span>'
  )
  .join('\n');

let out = '{%- comment -%} Auto-generated from edgewater_reviews_for_website.json {%- endcomment -%}\n';

reviews.forEach((review, index) => {
  const profileFile = 'review-avatar-' + review.profile_image.replace('profile_images/', '');
  const name = escapeHtml(review.name);
  const quote = escapeHtml(review.review);

  out += `{% capture review_card_${index} %}\n`;
  out += `  <article class="customer-review">\n`;
  out += `    <img\n`;
  out += `      class="customer-review__avatar"\n`;
  out += `      src="{{ '${profileFile}' | asset_url }}"\n`;
  out += `      alt="${name} profile photo"\n`;
  out += `      width="56"\n`;
  out += `      height="56"\n`;
  out += `      loading="lazy"\n`;
  out += `    >\n`;
  out += `    <div class="customer-review__stars" aria-label="5 out of 5 stars">\n`;
  out += `${stars}\n`;
  out += `    </div>\n`;
  out += `    <blockquote class="customer-review__quote"><p>&ldquo;${quote}&rdquo;</p></blockquote>\n`;
  out += `    <footer class="customer-review__footer">\n`;
  out += `      <cite class="customer-review__author">${name}</cite>\n`;
  out += `      <span class="customer-review__verified">Verified Buyer</span>\n`;
  out += `    </footer>\n`;
  out += `  </article>\n`;
  out += `{% endcapture %}\n`;
  out += `{% render 'slideshow-slide',\n`;
  out += `  index: ${index},\n`;
  out += `  children: review_card_${index},\n`;
  out += `  class: 'customer-reviews__slide'\n`;
  out += `%}\n\n`;
});

out += `{%- assign edgewater_review_slide_count = ${reviews.length} -%}\n`;

fs.writeFileSync(path.join(__dirname, '../snippets/edgewater-reviews-slides.liquid'), out, 'utf8');
console.log(`Generated ${reviews.length} review slides.`);
