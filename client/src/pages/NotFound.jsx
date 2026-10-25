import { Link } from 'react-router-dom';
import { EmptyState } from '../components/States';
export default function NotFound() {
  return <EmptyState title="Page not found" text="That page doesn't exist or was moved." action={<Link to="/" className="btn-primary">Back to home</Link>} />;
}
