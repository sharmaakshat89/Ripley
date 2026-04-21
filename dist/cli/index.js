import 'dotenv/config';
import { log, error, success } from '../utils/logger';
const args = process.argv.slice(2);
const command = args[0];
const supportedCommands = ['init', 'analyze', 'fix', 'check'];
if (!command) {
    error('No command provided. Supported commands: ' + supportedCommands.join(', '));
    process.exit(1);
}
if (!supportedCommands.includes(command)) {
    error(`Unknown command: ${command}. Supported commands: ` + supportedCommands.join(', '));
    process.exit(1);
}
log(`Executing command: ${command}`);
// Execute command logic here...
success(`Command ${command} executed successfully.`);
