import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/common/Pagination';
import UserPhoto from '@/components/ui/userPhoto';
import SpinnerRow from '@/components/ui/spinnerRow';

const CustomTable = ({
  headers,
  data,
  loading,
  onFilterChange,
  totalPages,
  currentPage,
  onPageChange,
  pageSize,
  onPageSizeChange,
  showFilters = true,
  showPagination = true
}) => {
  const [filter, setFilter] = useState({});

  const applyFilterNow = (filterToApply) => {
    const { orderBy, orderDirection, ...queryFilter } = filterToApply;
    const cleanedFilter = {};

    for (const [key, value] of Object.entries(queryFilter)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanedFilter[key] = value;
      }
    }

    if (filterToApply.ordering) {
      cleanedFilter.ordering = filterToApply.ordering;
    }

    onFilterChange(cleanedFilter);
  };

  const handleFilterChange = useCallback((e) => {
    const { name, value, type, checked } = e.target || {};
    const finalValue = type === 'checkbox' ? checked : value?.toLowerCase?.() || value;

    setFilter((prev) => {
      const newFilter = { ...prev };
      if ((type === 'checkbox' && !finalValue) || (type !== 'checkbox' && (finalValue === '' || finalValue === undefined))) {
        delete newFilter[name];
      } else {
        newFilter[name] = finalValue;
      }
      return newFilter;
    });
  }, []);

    const handleSortClick = (field) => {
    const isSameField = filter.orderBy === field;
    const newDirection = isSameField && filter.orderDirection === 'asc' ? 'desc' : 'asc';
    const ordering = newDirection === 'desc' ? `-${field}` : field;

    const updatedFilter = {
      ...filter,
      orderBy: field,
      orderDirection: newDirection,
      ordering: ordering,
    };

    setFilter(updatedFilter);
    applyFilterNow(updatedFilter);
  };

  const DateTimeFormat = (fecha) => {
    return format(fecha, 'dd/MM/yyyy HH:mm', { locale: es });
  };
  
  const onApplyFilter = useCallback(() => {
    applyFilterNow(filter);
  }, [filter]);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead
                key={header.name}
                onClick={() => header.sortable && handleSortClick(header.name)}
                style={{ cursor: header.sortable ? 'pointer' : 'default' }}
                className="select-none"
              >
                <span className="inline-flex items-center gap-1">
                  {header.label}
                  {header.sortable && filter.orderBy === header.name && (
                    <span className="inline-block w-4 text-center">
                      {filter.orderDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>

          {showFilters && (
            <TableRow>
              {headers.map((header) => {
                if (header.label.toLowerCase() === 'acciones') {
                  return (
                    <TableCell key={header.name} colSpan={headers.length} className="text-center">
                      <Button onClick={onApplyFilter}>Aplicar filtro</Button>
                    </TableCell>
                  );
                }

                if (!header.type) {
                  return <TableCell key={header.name} />;
                }

                return (
                  <TableCell key={header.name} className={header.type === 'checkbox' ? 'text-center align-middle' : ''}>
                    <div className={header.type === 'checkbox' ? 'flex justify-center items-center' : ''}>
                      {header.type === 'select' && header.options ? (
                        <Select
                          value={filter[header.name] || '__all__'}
                          onValueChange={(value) => {
                            handleFilterChange({
                              target: {
                                name: header.name,
                                value: value === '__all__' ? undefined : value,
                                type: 'select'
                              }
                            });
                          }}
                        >
                          <SelectTrigger className="w-full text-sm">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todos</SelectItem>
                            {header.options.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                      ) : (header.type==="datetime")?
                        <Input
                          type='datetime-local'
                          name={header.name}
                          onChange={handleFilterChange}
                        />
                      :(
                        <Input
                          className={header.type === 'checkbox' ? 'w-4 h-4' : ''}
                          type={header.type}
                          name={header.name}
                          onChange={handleFilterChange}
                        />
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          )}
        </TableHeader>

        <TableBody>
          {loading ? (
            <SpinnerRow colSpan={headers.length} />
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={headers.length}>No hay datos disponibles.</TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <TableRow key={row.id || rowIndex}>
                {headers.map((header) =>
                  header.name === 'acciones' && header.actions ? (
                    <TableCell key={header.name} className="text-right">
                      <div className="flex justify-center gap-2">
                        {header.actions.map((action, i) => {
                          const shouldRender = action.condition ? action.condition(row) : true;
                          return shouldRender && (
                            <Button
                              key={i}
                              size="sm"
                              variant={action.variant || 'default'}
                              onClick={() => action.onClick(row)}
                              disabled={action.disabled || false}
                            >
                              {action.label}
                            </Button>
                          );
                        })}
                      </div>
                    </TableCell>
                  ) : header.label === 'Foto' ? (
                    <TableCell key={header.name}>
                      <UserPhoto
                        src={row[header.name]}
                        alt={`Foto de ${row.nombre} ${row.apellido1}`}
                        className="w-10 h-10 rounded-full"
                        table={true}
                      />
                    </TableCell>
                  ) : header.type === 'date'?
                    <TableCell key={header.name}>
                      {row[header.name] ? new Date(row[header.name]).toLocaleDateString() : ''}
                    </TableCell>
                   : header.type === 'datetime'?
                    <TableCell key={header.name}>{DateTimeFormat(row[header.name]).toLocaleString()}</TableCell>
                  :
                   (
                    <TableCell key={header.name}>{row[header.name]}</TableCell>
                  )
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="border-t bg-gray-50 p-4 rounded-b-lg">
        {showPagination && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
          />
        )}
      </div>
    </div>
  );
};

export default CustomTable;
