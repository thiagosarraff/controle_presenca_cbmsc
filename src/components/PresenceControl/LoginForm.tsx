type LoginFormProps = {
  senha: string
  onSenhaChange: (senha: string) => void
  onLogin: () => void
  onCancel: () => void
}

export function LoginForm({ senha, onSenhaChange, onLogin, onCancel }: LoginFormProps) {
  return (
    <div className="space-y-4">
      <input
        type="password"
        value={senha}
        onChange={(e) => onSenhaChange(e.target.value)}
        placeholder="Senha do Administrador"
        className="w-full p-2 border rounded"
      />
      <div className="flex gap-2">
        <button
          onClick={onLogin}
          className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Entrar
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}