/**
 * Model Context Protocol (MCP) Server
 * 
 * MCP enables the AI to interact with external tools and data sources
 * This implementation provides tools for:
 * - User data access
 * - Health metrics retrieval
 * - External API integrations (weather, nutrition, etc.)
 * - Goal management
 * - Action execution
 */

export interface MCPTool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      required?: boolean
    }>
    required?: string[]
  }
}

export interface MCPRequest {
  tool: string
  parameters: Record<string, any>
  userId: string
}

export interface MCPResponse {
  success: boolean
  data?: any
  error?: string
  citations?: string[]
}

export class MCPServer {
  private tools: Map<string, MCPTool> = new Map()
  private handlers: Map<string, (params: any, userId: string) => Promise<MCPResponse>> = new Map()

  constructor() {
    this.registerDefaultTools()
  }

  /**
   * Register a new MCP tool
   */
  registerTool(tool: MCPTool, handler: (params: any, userId: string) => Promise<MCPResponse>) {
    this.tools.set(tool.name, tool)
    this.handlers.set(tool.name, handler)
  }

  /**
   * Execute an MCP tool request
   */
  async execute(request: MCPRequest): Promise<MCPResponse> {
    const tool = this.tools.get(request.tool)
    if (!tool) {
      return {
        success: false,
        error: `Tool "${request.tool}" not found`
      }
    }

    const handler = this.handlers.get(request.tool)
    if (!handler) {
      return {
        success: false,
        error: `Handler for tool "${request.tool}" not found`
      }
    }

    // Validate parameters
    const validationError = this.validateParameters(request.parameters, tool.parameters)
    if (validationError) {
      return {
        success: false,
        error: validationError
      }
    }

    try {
      return await handler(request.parameters, request.userId)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get all available tools
   */
  getTools(): MCPTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get tool definitions in OpenAI function calling format
   */
  getOpenAITools(): Array<{
    type: 'function'
    function: {
      name: string
      description: string
      parameters: any
    }
  }> {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))
  }

  /**
   * Validate parameters against tool schema
   */
  private validateParameters(params: Record<string, any>, schema: MCPTool['parameters']): string | null {
    const required = schema.required || []
    
    for (const field of required) {
      if (!(field in params)) {
        return `Missing required parameter: ${field}`
      }
    }

    for (const [key, value] of Object.entries(params)) {
      const prop = schema.properties[key]
      if (!prop) {
        return `Unknown parameter: ${key}`
      }

      const expectedType = prop.type
      const actualType = Array.isArray(value) ? 'array' : typeof value

      if (expectedType === 'array' && !Array.isArray(value)) {
        return `Parameter "${key}" must be an array`
      }

      if (expectedType !== 'array' && actualType !== expectedType) {
        return `Parameter "${key}" must be of type ${expectedType}, got ${actualType}`
      }
    }

    return null
  }

  /**
   * Register default tools
   */
  private registerDefaultTools() {
    // User data retrieval tools
    this.registerTool(
      {
        name: 'get_user_health_metrics',
        description: 'Retrieve user health metrics including sleep, HRV, steps, mood, and energy levels',
        parameters: {
          type: 'object',
          properties: {
            metric_types: {
              type: 'array',
              description: 'Array of metric types to retrieve (sleep, hrv, steps, mood, energy, etc.)'
            },
            time_range: {
              type: 'string',
              description: 'Time range for metrics: "today", "week", "month", or "all"'
            }
          }
        }
      },
      async (params, userId) => {
        // This will be implemented with actual data retrieval
        return {
          success: true,
          data: {
            metrics: [],
            message: 'Health metrics retrieved'
          }
        }
      }
    )

    this.registerTool(
      {
        name: 'get_user_goals',
        description: 'Retrieve user active goals and progress',
        parameters: {
          type: 'object',
          properties: {
            include_completed: {
              type: 'boolean',
              description: 'Whether to include completed goals'
            }
          }
        }
      },
      getUserGoals
    )

    this.registerTool(
      {
        name: 'get_user_preferences',
        description: 'Retrieve user preferences including dietary restrictions, fitness level, and equipment',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      getUserPreferences
    )

    // External API tools
    this.registerTool(
      {
        name: 'get_weather',
        description: 'Get current weather information for user location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location (city, state or coordinates)'
            }
          }
        }
      },
      getWeather
    )

    this.registerTool(
      {
        name: 'get_nutrition_info',
        description: 'Get nutritional information for a food item',
        parameters: {
          type: 'object',
          properties: {
            food_item: {
              type: 'string',
              description: 'Name of the food item'
            }
          },
          required: ['food_item']
        }
      },
      getNutritionInfo
    )

    this.registerTool(
      {
        name: 'get_exercise_suggestions',
        description: 'Get personalized exercise suggestions based on user context',
        parameters: {
          type: 'object',
          properties: {
            duration: {
              type: 'number',
              description: 'Desired duration in minutes'
            },
            intensity: {
              type: 'string',
              description: 'Exercise intensity: low, moderate, or high'
            },
            equipment: {
              type: 'array',
              description: 'Available equipment'
            }
          }
        }
      },
      getExerciseSuggestions
    )

    // Action execution tools
    this.registerTool(
      {
        name: 'create_goal',
        description: 'Create a new health or fitness goal for the user',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Goal title'
            },
            category: {
              type: 'string',
              description: 'Goal category (nutrition, exercise, sleep, stress, etc.)'
            },
            target: {
              type: 'number',
              description: 'Target value'
            },
            unit: {
              type: 'string',
              description: 'Unit of measurement'
            }
          },
          required: ['title', 'category', 'target', 'unit']
        }
      },
      createGoal
    )

    this.registerTool(
      {
        name: 'log_action',
        description: 'Log a completed action for tracking and learning',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'Description of the action'
            },
            type: {
              type: 'string',
              description: 'Action type (checklist, timer, reminder, schedule)'
            },
            success: {
              type: 'boolean',
              description: 'Whether the action was successful'
            }
          },
          required: ['action', 'type']
        }
      },
      logAction
    )
  }
}

// Singleton instance
let mcpServerInstance: MCPServer | null = null

export function getMCPServer(): MCPServer {
  if (!mcpServerInstance) {
    mcpServerInstance = new MCPServer()
  }
  return mcpServerInstance
}

