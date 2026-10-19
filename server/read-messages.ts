import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { inquiryLabel } from '../src/lib/contact-schema';
import type { InquiryValue } from '../src/lib/contact-schema';

interface StoredMessage {
  id: string;
  receivedAt: string;
  name: string;
  email: string;
  inquiry: string;
  message: string;
}

const file = path.resolve(process.env.DATA_DIR ?? 'data', 'contact-submissions.jsonl');

try {
  const contents = await readFile(file, 'utf8');
  const messages = contents
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StoredMessage);

  if (messages.length === 0) {
    console.log('No messages yet.');
  } else {
    console.log(`${messages.length} message${messages.length === 1 ? '' : 's'} in ${file}\n`);
    messages.reverse().forEach((message, index) => {
      console.log('─'.repeat(64));
      console.log(
        `#${index + 1}  ${message.receivedAt}  [${inquiryLabel(message.inquiry as InquiryValue)}]`,
      );
      console.log(`${message.name} <${message.email}>`);
      console.log('');
      console.log(message.message);
      console.log('');
    });
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    console.log(`No messages yet (${file} does not exist).`);
  } else {
    console.error('Could not read messages:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
