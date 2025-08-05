const Joi = require('joi');

// Pagination schema validation
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().allow('').optional(),
});

class PaginationHelper {
  static validateParams(query) {
    const { error, value } = paginationSchema.validate(query);
    if (error) {
      throw new Error(`Invalid pagination parameters: ${error.details[0].message}`);
    }
    return value;
  }

  static calculateOffset(page, limit) {
    return (page - 1) * limit;
  }

  static buildCountQuery(baseQuery, whereClause = '') {
    const query = baseQuery.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
    return whereClause ? `${query} ${whereClause}` : query;
  }

  static buildPaginatedQuery(baseQuery, whereClause = '', orderBy = '', limit = 20, offset = 0) {
    let query = baseQuery;
    
    if (whereClause) {
      query += ` ${whereClause}`;
    }
    
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    return query;
  }

  static buildSearchWhere(searchTerm, searchColumns) {
    if (!searchTerm || !searchColumns.length) {
      return '';
    }

    const conditions = searchColumns.map(column => `${column} LIKE ?`).join(' OR ');
    return `WHERE (${conditions})`;
  }

  static buildSortClause(sort, order, allowedColumns) {
    if (!allowedColumns.includes(sort)) {
      throw new Error(`Invalid sort column: ${sort}`);
    }
    
    return `${sort} ${order.toUpperCase()}`;
  }

  static createResponse(data, total, page, limit, requestUrl) {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const baseUrl = requestUrl.split('?')[0];
    const queryParams = new URLSearchParams();
    
    // Build pagination links
    const buildLink = (pageNum) => {
      queryParams.set('page', pageNum);
      queryParams.set('limit', limit);
      return `${baseUrl}?${queryParams.toString()}`;
    };

    return {
      data,
      pagination: {
        current_page: page,
        per_page: limit,
        total_items: total,
        total_pages: totalPages,
        has_next: hasNext,
        has_prev: hasPrev,
        links: {
          first: buildLink(1),
          last: buildLink(totalPages),
          next: hasNext ? buildLink(page + 1) : null,
          prev: hasPrev ? buildLink(page - 1) : null,
        },
      },
    };
  }

  static async paginate(db, config) {
    const {
      baseQuery,
      searchColumns = [],
      allowedSortColumns = ['created_at'],
      defaultSort = 'created_at',
      params = {},
      requestUrl = '',
    } = config;

    // Validate pagination parameters
    const paginationParams = this.validateParams(params);
    const { page, limit, sort, order, search } = paginationParams;

    // Calculate offset
    const offset = this.calculateOffset(page, limit);

    // Build search where clause
    const searchWhere = this.buildSearchWhere(search, searchColumns);
    const searchParams = search ? Array(searchColumns.length).fill(`%${search}%`) : [];

    // Build sort clause
    const sortClause = this.buildSortClause(sort || defaultSort, order, allowedSortColumns);

    // Get total count
    const countQuery = this.buildCountQuery(baseQuery, searchWhere);
    const countResult = await new Promise((resolve, reject) => {
      db.get(countQuery, searchParams, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const total = countResult.total;

    // Get paginated data
    const dataQuery = this.buildPaginatedQuery(
      baseQuery,
      searchWhere,
      `ORDER BY ${sortClause}`,
      limit,
      offset
    );

    const data = await new Promise((resolve, reject) => {
      db.all(dataQuery, searchParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    return this.createResponse(data, total, page, limit, requestUrl);
  }

  // Helper for cursor-based pagination (for real-time data)
  static async cursorPaginate(db, config) {
    const {
      baseQuery,
      cursorColumn = 'id',
      cursor,
      limit = 20,
      order = 'desc',
      requestUrl = '',
    } = config;

    const isDesc = order.toLowerCase() === 'desc';
    const operator = isDesc ? '<' : '>';
    const orderDirection = isDesc ? 'DESC' : 'ASC';

    let query = baseQuery;
    let params = [];

    if (cursor) {
      query += ` WHERE ${cursorColumn} ${operator} ?`;
      params.push(cursor);
    }

    query += ` ORDER BY ${cursorColumn} ${orderDirection} LIMIT ${limit + 1}`;

    const results = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;
    const nextCursor = hasMore ? data[data.length - 1][cursorColumn] : null;

    return {
      data,
      pagination: {
        has_more: hasMore,
        next_cursor: nextCursor,
        limit,
        links: {
          next: nextCursor ? `${requestUrl}?cursor=${nextCursor}&limit=${limit}` : null,
        },
      },
    };
  }
}

// Middleware for automatic pagination
const paginationMiddleware = (config = {}) => {
  return (req, res, next) => {
    req.pagination = {
      params: {
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 20, 100),
        sort: req.query.sort || config.defaultSort || 'created_at',
        order: req.query.order || 'desc',
        search: req.query.search || '',
      },
      helper: PaginationHelper,
    };
    next();
  };
};

module.exports = {
  PaginationHelper,
  paginationMiddleware,
  paginationSchema,
};
