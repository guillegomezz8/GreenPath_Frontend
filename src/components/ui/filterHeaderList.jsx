import { useState, useCallback  } from 'react';
import { TableCell, TableHead, TableHeader, TableRow, Table, TableBody } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
/**
 * Componente que renderiza los filtros en el encabezado de una tabla.
 *
 * @param {{
 *   headers: Array<{
 *     label: string,
 *     name: string,
 *     type?: string
 *   }>,
 *   onFilterChange: (filters: { [key: string]: string | boolean }) => void
 * }} props
 * 
 * Ejemplo de headers:
 * [
 *   { label: "Nombre", name: "name", type: "text" },
 *   { label: "Estado", name: "estado", type: "checkbox" },
 *   { label: "Acciones", name: "acciones" }
 * ]
 */
const filterHeaderList = ({
  headers,
  data,
  onFilterChange,
  totalPages,
  currentPage,
  onPageChange,
}) => {
  const [appliedFilter, setAppliedFilter] = useState({});
  const [filter, setFilter] = useState({});

  const handleFilterChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value.toLowerCase();

    setFilter((prev) => {
      const newFilter = { ...prev };

      if ((type === 'checkbox' && !finalValue) || (type !== 'checkbox' && finalValue === '')) {
        delete newFilter[name];
      } else {
        newFilter[name] = finalValue;
      }

      return newFilter;
    });
  }, []);

    const handleSortClick = (field) => {
        setFilter((prev) => {
            const isSameField = prev.orderBy === field;
            const newDirection = isSameField && prev.orderDirection === 'asc' ? 'desc' : 'asc';
            const ordering = newDirection === 'desc' ? `-${field}` : field;
            return {
                ...prev,
                orderBy: field,
                orderDirection: newDirection,
                ordering: ordering,
            };
        });
        onApplyFilter();
    };

    const onApplyFilter = useCallback(() => {
    if (filter === appliedFilter) {
        return;
    }

    const { orderBy, orderDirection, ...queryFilter } = filter;
    
    const cleanedFilter = {};
    for (const [key, value] of Object.entries(queryFilter)) {
        if (value !== undefined && value !== null && value !== '') {
        cleanedFilter[key] = value;
        }
    }
    setAppliedFilter(filter);
    onFilterChange(cleanedFilter);
    }, [filter, appliedFilter, onFilterChange]);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead
                key={header.name}
                onClick={() => header.type && handleSortClick(header.name)}
                style={{ cursor: header.type ? 'pointer' : 'default' }}
                className="select-none"
              >
                <span className="inline-flex items-center gap-1">
                  {header.label}
                  {header.type && filter.orderBy === header.name && (
                    <span className="inline-block w-4 text-center">
                      {filter.orderDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            {headers.map((header) => {
              if (header.label.toLowerCase() === 'acciones') {
                return (
                  <TableCell key={header.name} colSpan={headers.length} className="text-right">
                    <Button onClick={onApplyFilter}>Aplicar filtro</Button>
                  </TableCell>
                );
              }

              if (!header.type) {
                return <TableCell key={header.name} />;
              }

              return (
                <TableCell key={header.name}>
                  <Input
                    className={header.type === 'checkbox' ? 'w-4 h-4 mr-2' : ''}
                    type={header.type}
                    name={header.name}
                    onChange={handleFilterChange}
                  />
                </TableCell>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={headers.length}>No hay datos disponibles.</TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow key={row.id || rowIndex}>
                {headers.map((header) => (
                  <TableCell key={header.name}>{row[header.name]}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
};

export default filterHeaderList;
