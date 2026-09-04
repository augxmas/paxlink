import "dotenv/config";
import nodemailer from "nodemailer";

const required=["SMTP_HOST","SMTP_PORT","SMTP_USER","SMTP_PASS","SMTP_FROM"];
const missing=required.filter(name=>!process.env[name]);
if(missing.length)throw new Error(`누락된 SMTP 설정: ${missing.join(", ")}`);
const transport=nodemailer.createTransport({
  host:process.env.SMTP_HOST,
  port:Number(process.env.SMTP_PORT),
  secure:process.env.SMTP_SECURE==="true"||Number(process.env.SMTP_PORT)===465,
  auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD??process.env.SMTP_PASS},
  connectionTimeout:10000,
  greetingTimeout:10000,
  socketTimeout:15000
});
await transport.verify();
console.log("SMTP 연결 및 계정 인증에 성공했습니다.");
transport.close();
