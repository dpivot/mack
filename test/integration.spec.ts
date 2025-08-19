import {markdownToBlocks} from '../src';
import * as slack from '../src/slack';

describe('integration with unified', () => {
  it('should parse raw markdown into slack blocks', async () => {
    const text = `
a **b** _c_ **_d_ e**

# heading **a**

![59953191-480px](https://user-images.githubusercontent.com/16073505/123464383-b8715300-d5ba-11eb-8586-b1f965e1f18d.jpg)

<img src="https://user-images.githubusercontent.com/16073505/123464383-b8715300-d5ba-11eb-8586-b1f965e1f18d.jpg" alt="59953191-480px"/>

> block quote **a**
> block quote b

[link](https://apple.com)

- bullet _a_
- bullet _b_

1. number _a_
2. number _b_

- [ ] checkbox false
- [x] checkbox true

| Syntax      | Description |
| ----------- | ----------- |
| Header      | Title       |
| Paragraph   | Text        |
`;

    const actual = await markdownToBlocks(text);

    const expected = [
      slack.section('a *b* _c_ *_d_ e*'),
      slack.header('heading a'),
      slack.image(
        'https://user-images.githubusercontent.com/16073505/123464383-b8715300-d5ba-11eb-8586-b1f965e1f18d.jpg',
        '59953191-480px'
      ),
      slack.image(
        'https://user-images.githubusercontent.com/16073505/123464383-b8715300-d5ba-11eb-8586-b1f965e1f18d.jpg',
        '59953191-480px'
      ),
      slack.section('> block quote *a*\n> block quote b'),
      slack.section('<https://apple.com|link> '),
      slack.section('• bullet _a_\n• bullet _b_'),
      slack.section('1. number _a_\n2. number _b_'),
      slack.section('• checkbox false\n• checkbox true'),
      slack.section(
        '```\n' +
          'Syntax     Description\n' +
          '---------  -----------\n' +
          'Header     Title\n' +
          'Paragraph  Text\n' +
          '```'
      ),
    ];

    expect(actual).toStrictEqual(expected);
  });

  it('should parse long markdown', async () => {
    const text: string = new Array(3500).fill('a').join('') + 'bbbcccdddeee';

    const actual = await markdownToBlocks(text);

    const expected = [slack.section(text.slice(0, 3000))];

    expect(actual).toStrictEqual(expected);
  });

  describe('code blocks', () => {
    it('should parse code blocks with no language', async () => {
      const text = `\`\`\`
if (a === 'hi') {
  console.log('hi!')
} else {
  console.log('hello')
}
\`\`\``;

      const actual = await markdownToBlocks(text);

      const expected = [
        slack.section(
          `\`\`\`
if (a === 'hi') {
  console.log('hi!')
} else {
  console.log('hello')
}
\`\`\``
        ),
      ];

      expect(actual).toStrictEqual(expected);
    });

    it('should parse code blocks with language', async () => {
      const text = `\`\`\`javascript
if (a === 'hi') {
  console.log('hi!')
} else {
  console.log('hello')
}
\`\`\``;

      const actual = await markdownToBlocks(text);

      const expected = [
        slack.section(
          `\`\`\`
if (a === 'hi') {
  console.log('hi!')
} else {
  console.log('hello')
}
\`\`\``
        ),
      ];

      expect(actual).toStrictEqual(expected);
    });
  });

  it('should correctly escape text', async () => {
    const actual = await markdownToBlocks('<>&\'""\'&><');
    const expected = [slack.section('&lt;&gt;&amp;\'""\'&amp;&gt;&lt;')];
    expect(actual).toStrictEqual(expected);
  });

  it('should handle apostrophes correctly without HTML encoding', async () => {
    const text = `The 'thing' in the 'dark', it's a blur,
A whisper, a 'sigh', a soft purr.
Don't ask what it's 'seen', or where it's been,
Just the 'echo' of 'what's' within.
Its 'eyes', like two 'stars', gleam so bright,
A 'mystery' 'neath' the 'moon's' pale light.`;

    const actual = await markdownToBlocks(text);
    const expected = [
      slack.section(`The 'thing' in the 'dark', it's a blur,
A whisper, a 'sigh', a soft purr.
Don't ask what it's 'seen', or where it's been,
Just the 'echo' of 'what's' within.
Its 'eyes', like two 'stars', gleam so bright,
A 'mystery' 'neath' the 'moon's' pale light.`),
    ];

    expect(actual).toStrictEqual(expected);
  });

  it('should handle various special characters without unwanted HTML encoding', async () => {
    const text = `Testing "quotes" and 'apostrophes' and \`backticks\`
Forward/slash and other special chars
"Smart quotes" shouldn't be HTML encoded
It's important that contractions work`;

    const actual = await markdownToBlocks(text);
    const expected = [
      slack.section(`Testing "quotes" and 'apostrophes' and \`backticks\`
Forward/slash and other special chars
"Smart quotes" shouldn't be HTML encoded
It's important that contractions work`),
    ];

    expect(actual).toStrictEqual(expected);
  });

  describe('ASCII tables', () => {
    it('should format tables with varying column widths', async () => {
      const text = `
| Short | Medium Column | Very Long Column Name |
| ----- | ------------- | --------------------- |
| A     | Some text     | This is a longer text |
| B     | More content  | Another long entry    |
`;

      const actual = await markdownToBlocks(text);

      const expected = [
        slack.section(
          '```\n' +
            'Short  Medium Column  Very Long Column Name\n' +
            '-----  -------------  ---------------------\n' +
            'A      Some text      This is a longer text\n' +
            'B      More content   Another long entry\n' +
            '```'
        ),
      ];

      expect(actual).toStrictEqual(expected);
    });

    it('should handle tables with inline formatting', async () => {
      const text = `
| Column | **Bold** | _Italic_ |
| ------ | -------- | -------- |
| Row 1  | **text** | _text_   |
| Row 2  | normal   | \`code\`   |
`;

      const actual = await markdownToBlocks(text);

      const expected = [
        slack.section(
          '```\n' +
            'Column  Bold    Italic\n' +
            '------  ------  ------\n' +
            'Row 1   text    text\n' +
            'Row 2   normal  code\n' +
            '```'
        ),
      ];

      expect(actual).toStrictEqual(expected);
    });

    it('should handle tables with empty cells', async () => {
      const text = `
| Column A | Column B | Column C |
| -------- | -------- | -------- |
| Value 1  |          | Value 3  |
|          | Value 2  |          |
`;

      const actual = await markdownToBlocks(text);

      const expected = [
        slack.section(
          '```\n' +
            'Column A  Column B  Column C\n' +
            '--------  --------  --------\n' +
            'Value 1             Value 3\n' +
            '          Value 2\n' +
            '```'
        ),
      ];

      expect(actual).toStrictEqual(expected);
    });

    it('should handle single column tables', async () => {
      const text = `
| Single Column |
| ------------- |
| Row 1         |
| Row 2         |
| Row 3         |
`;

      const actual = await markdownToBlocks(text);

      const expected = [
        slack.section(
          '```\n' +
            'Single Column\n' +
            '-------------\n' +
            'Row 1\n' +
            'Row 2\n' +
            'Row 3\n' +
            '```'
        ),
      ];

      expect(actual).toStrictEqual(expected);
    });

    it('should handle tables with many columns', async () => {
      const text = `
| A | B | C | D | E | F |
| - | - | - | - | - | - |
| 1 | 2 | 3 | 4 | 5 | 6 |
`;

      const actual = await markdownToBlocks(text);

      const expected = [
        slack.section(
          '```\n' +
            'A  B  C  D  E  F\n' +
            '-  -  -  -  -  -\n' +
            '1  2  3  4  5  6\n' +
            '```'
        ),
      ];

      expect(actual).toStrictEqual(expected);
    });
  });
});
