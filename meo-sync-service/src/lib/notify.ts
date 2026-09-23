import { sendMail, isMailerConfigured } from "./mailer";
import type { Business } from "./businesses";

export async function notifyBusiness(
  business: Pick<Business, "alertEmail" | "slackWebhookUrl">,
  subject: string,
  message: string
): Promise<void> {
  const jobs: Promise<void>[] = [];

  if (business.slackWebhookUrl) {
    jobs.push(
      fetch(business.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `*${subject}*\n${message}` }),
      }).then((res) => {
        if (!res.ok) throw new Error(`Slack通知に失敗しました: ${res.status}`);
      })
    );
  }

  if (business.alertEmail) {
    if (!isMailerConfigured()) {
      throw new Error(
        "通知先メールアドレスが設定されていますが、サーバー側のSMTP設定(.envのSMTP_HOST等)が未完了のため送信できません"
      );
    }
    jobs.push(sendMail({ to: business.alertEmail, subject, text: message }));
  }

  if (jobs.length === 0) {
    throw new Error("通知先(メール/Slack)が設定されていません");
  }

  await Promise.all(jobs);
}
