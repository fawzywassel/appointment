interface PriorityBadgeProps {
  priority: string;
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getPriorityStyles = () => {
    switch (priority.toUpperCase()) {
      case 'URGENT':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: '🔴' };
      case 'HIGH':
        return { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🟠' };
      case 'MEDIUM':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🟡' };
      case 'LOW':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: '🟢' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: '⚪' };
    }
  };

  const styles = getPriorityStyles();

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles.bg} ${styles.text}`}>
      <span className="mr-1">{styles.icon}</span>
      {priority}
    </span>
  );
}
