import { Loader } from 'lucide-react';

const SpinnerRow = ({ colSpan }) => (
  <tr>
    <td colSpan={colSpan}>
      <div className="flex items-center justify-center py-8">
        <Loader className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    </td>
  </tr>
);

export default SpinnerRow;