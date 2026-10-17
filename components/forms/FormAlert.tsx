export function FormAlert({ error, success }: { error?: string; success?: string }) {
  if (error) {
    return (
      <div className="alert alert--error" role="alert">
        {error}
      </div>
    );
  }
  if (success) {
    return (
      <div className="alert alert--ok" role="status">
        {success}
      </div>
    );
  }
  return null;
}
