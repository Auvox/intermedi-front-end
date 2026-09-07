import { useState } from "react";

function LoginUser() {

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  function enviar() {

    fetch(
      "http://localhost/repositorioIntermedi/Intermedi/backEnd/api/usuarios/loginUsuario.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          senha
        })
      }
    )
      .then(res => res.json())
      .then(data => {
        console.log(data);
      })
      .catch(err => {
        console.log(err);
      });

  }

  return (
    <div>

      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Senha"
        onChange={(e) => setSenha(e.target.value)}
      />

      <button onClick={enviar}>
        Entrar
      </button>

    </div>
  );
}

export default LoginUser;