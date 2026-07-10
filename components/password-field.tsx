"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  placeholder?: string;
};

export function PasswordField({ id, name, label, autoComplete, placeholder }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-wrap">
        <input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder} />
        <button className="password-toggle" type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "隐藏密码" : "显示密码"} title={visible ? "隐藏密码" : "显示密码"}>
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}
