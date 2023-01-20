
import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import * as nm from 'nodemailer';
import * as smtp from 'nodemailer/lib/smtp-transport';

tl.setResourcePath(path.join(__dirname, 'task.json'));

export async function run(): Promise<void> {
    try {
        // Read the task inputs
        const port = tl.getInput('SmtpPort', true);
        const config = {
            smtpServer: tl.getInput('SmtpServer', true),
            smtpPort: parseInt(port !== undefined ? port : '25'),
            isSSL: tl.getBoolInput('UseSSL', true),
            auth: {
                user: tl.getInput('SmtpUsername'),
                pass: tl.getInput('SmtpPassword')
            },
            from: tl.getInput('From', true),
            to: tl.getInput('To', true),
            cc: tl.getInput('CC'),
            bcc: tl.getInput('BCC'),
            subject: tl.getInput('Subject', true),
            body: tl.getInput('Body', true),
            isBodyHtml: tl.getBoolInput('BodyAsHtml', true),
            attachment: tl.getPathInput('Attachment', false, true)
        };

        // Debug for the inputs
        tl.debug('------------------  Configuration ------------------');
        tl.debug(`config.smtpServer=${config.smtpServer}`);
        tl.debug(`config.smtpPort=${config.smtpPort}`);
        tl.debug(`config.isSSL=${config.isSSL}`);
        tl.debug(`config.auth.user=${config.auth.user}`);
        tl.debug(`config.auth.pass=${config.auth.pass}`);
        tl.debug(`config.from=${config.from}`);
        tl.debug(`config.to=${config.to}`);
        tl.debug(`config.cc=${config.cc}`);
        tl.debug(`config.bcc=${config.bcc}`);
        tl.debug(`config.subject=${config.subject}`);
        tl.debug(`config.body=${config.body}`);
        tl.debug(`config.isBodyHtml=${config.isBodyHtml}`);
        tl.debug(`config.attachment=${config.attachment}`);
        tl.debug('-----------------------------------------------------');

        // Create the transporter for sending the email message
        const transporter = nm.createTransport(<smtp.Options>{
            host: config.smtpServer,
            port: config.smtpPort,
            secure: config.isSSL,
            auth : config.auth,
            ignoreTLS: config.isSSL ? false : true
        });

        // Create the message we will send
        const email = <nm.SendMailOptions>{
            from: config.from,
            to: config.to ? config.to.split(';,').join(',') : undefined,
            cc: config.cc ? config.cc.split(';,').join(',') : undefined,
            bcc: config.bcc ? config.bcc.split(';,').join(',') : undefined,
            subject: config.subject,
            text : !config.isBodyHtml ? config.body : undefined,
            html: config.isBodyHtml ? config.body : undefined
        }

        if (config.attachment) {
            email.attachments = [{
                filename: path.basename(config.attachment),
                path: config.attachment
            }];
        }
        
        // Now send the message
        console.log();
        console.log(`Sending email '${email.subject}' to: '${email.to}'`);
        console.log('-----------------------------------------------------');
        console.log(config.body);
        console.log('-----------------------------------------------------');
        var info = await transporter.sendMail(email);

        console.log(`Message ID: ${info.messageId}`);

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('Success'));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, tl.loc('UnhandledProcessFailure', err), true);
        process.exit(1); // Force exit to kill any async methods
    }
}

run();