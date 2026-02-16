import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsAPI, type ResearchGroup } from '../services/api';
import './HomePage.css';

export default function HomePage() {
  const [groups, setGroups] = useState<ResearchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    groupsAPI.getAll().then(data => {
      setGroups(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="home-loading">Loading research groups...</div>;
  }

  if (groups.length === 0) {
    return (
      <div className="home-empty">
        <p>No research groups found.</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      <h1 className="home-title">Select Your Research Group</h1>
      <p className="home-subtitle">Click on your group to open the chat</p>
      <div className="home-grid">
        {groups.map(group => (
          <button
            key={group.id}
            className="group-card"
            onClick={() => navigate(`/study/${group.id}`)}
          >
            <div className="group-icon">💬</div>
            <div className="group-name">{group.name}</div>
            <div className="group-meta">{group.taskCount} task{group.taskCount !== 1 ? 's' : ''}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
