const { Router } = require('express');
const { prisma } = require('../lib/prisma');
const { checkJwt } = require('../middleware/auth');

const router = Router();

// Función helper para validar moderators_ids
// function validateModeratorIdsArray(moderators_ids) {
//   if (!Array.isArray(moderators_ids)) {
//     throw new Error('moderators_ids debe ser un arreglo');
//   }
  
//   // Validar que todos sean números enteros positivos
//   if (!moderators_ids.every(id => Number.isInteger(id) && id > 0)) {
//     throw new Error('moderators_ids debe contener solo números enteros positivos');
//   }
  
//   // Eliminar duplicados
//   return [...new Set(moderators_ids)];
// }


router.get('/my-groups', checkJwt, async (req, res) => {
  try {
    console.log('Ruta /my-groups alcanzada');
    console.log('Auth sub:', req.auth?.sub);

    // Encontrar el usuario por auth0_id
    const requestingUser = await prisma.user.findUnique({ 
      where: { auth0_id: req.auth.sub } 
    });

    console.log('Usuario encontrado:', requestingUser);

    // Verificar que el usuario es representante
    if (!requestingUser || !requestingUser.is_representative) {
      return res.status(403).json({ error: 'Requiere ser representante' });
    }

    // Buscar grupos donde el usuario es representante
    const groups = await prisma.group.findMany({ 
      where: { repre_id: requestingUser.id },
      include: {
        groupRequest: {
          select: {
            id: true,
            name: true,
            description: true,
            goal: true,
            logo: true,
            status: true
          }
        },
        eventRequests: {
          select: {
            id: true,
            name: true,
            status: true,
            day: true
          }
        }
      }
    });

    console.log('Grupos encontrados:', groups);

    res.json({
      total_groups: groups.length,
      groups
    });
  } catch (error) {
    console.error('Error completo:', error);
    res.status(500).json({ 
      error: 'Error interno', 
      details: error.message 
    });
  }
});

// GET /groups - Listar todos los grupos
router.get('/', async (req, res) => {
  try {
    const items = await prisma.group.findMany({ 
      orderBy: { id: 'asc' },
      include: {
        groupRequest: {
          select: {
            id: true,
            name: true,
            description: true,
            goal: true,
            logo: true,
            status: true,
            user: {
              select: { 
                id: true, 
                first_name: true, 
                last_name: true, 
                email: true 
              }
            }
          }
        },
        eventRequests: {
          select: {
            id: true,
            name: true,
            goal: true,
            status: true,
            day: true,
            module: true,
            // n_attendees: true
          }
        }
      }
    });

    // Recolectar todos los IDs únicos de una sola vez
    // const allModeratorIds = new Set();
    const allRepresentativeIds = new Set();
    
    items.forEach(group => {
      allRepresentativeIds.add(group.repre_id);
    });

    // Una sola query para TODOS los usuarios necesarios
    const allUserIds = [ ...allRepresentativeIds];
    const users = allUserIds.length > 0 
      ? await prisma.user.findMany({
        where: { id: { in: allUserIds } },
        select: { 
          id: true, 
          first_name: true, 
          last_name: true, 
          email: true 
        }
      })
      : [];

    // Crear un mapa para acceso rápido O(1)
    const usersMap = new Map(users.map(u => [u.id, u]));

    // Mapear los datos
    const itemsWithModerators = items.map(group => {
      // const moderatorIds = Array.isArray(group.moderators_ids) 
      //   ? group.moderators_ids 
      //   : [];
      
      // const moderators = moderatorIds
      //   .map(id => usersMap.get(id))
      //   .filter(Boolean); // Eliminar undefined si un ID no existe

      const representative = usersMap.get(group.repre_id) || null;

      return {
        ...group,
        representative,
        // moderators
      };
    });

    res.json(itemsWithModerators);
  } catch (error) {
    console.log('ERROR GET /groups:', error);
    res.status(500).json({ error: 'No se pudo listar los grupos' });
  }
});

// GET /groups/:id - Obtener grupo específico 
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const item = await prisma.group.findUnique({ 
      where: { id },
      include: {
        groupRequest: {
          include: {
            user: {
              select: { 
                id: true, 
                first_name: true, 
                last_name: true, 
                email: true,
                role: true 
              }
            }
          }
        },
        eventRequests: {
          include: {
            publicSpace: {
              select: {
                id: true,
                name: true,
                capacity: true,
                location: true
              }
            },
          },
          orderBy: { day: 'desc' }
        }
      }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    // Recolectar IDs de moderadores y representante
    // const moderatorIds = Array.isArray(item.moderators_ids) 
    //   ? item.moderators_ids 
    //   : [];
    
    const allUserIds = [item.repre_id];

    // Una sola query para todos los usuarios
    const users = allUserIds.length > 0
      ? await prisma.user.findMany({
        where: { id: { in: allUserIds } },
        select: { 
          id: true, 
          first_name: true, 
          last_name: true, 
          email: true,
          role: true,
          is_representative: true,
          // // is_moderator: true
        }
      })
      : [];

    // Separar representante y moderadores
    const representative = users.find(u => u.id === item.repre_id) || null;
    // const moderators = moderatorIds
    //   .map(id => users.find(u => u.id === id))
    //   .filter(Boolean);

    res.json({
      ...item,
      representative,
      // moderators
    });
  } catch (error) {
    console.log('ERROR GET /groups/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el grupo' });
  }
});

// POST /groups - Crear grupo (solo admin)
router.post('/', checkJwt, async (req, res) => {
  try {
    // Verificar que el usuario es admin
    const requestingUser = await prisma.user.findUnique({ 
      where: { auth0_id: req.auth.sub } 
    });

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Requiere permisos de administrador' });
    }

    const { repre_id, group_request_id, reputation } = req.body;
    
    // Validación de campos requeridos
    if (!repre_id || !group_request_id) {
      return res.status(400).json({ 
        error: 'repre_id y group_request_id son requeridos' 
      });
    }

    // Validar tipos
    if (!Number.isInteger(repre_id) || repre_id <= 0) {
      return res.status(400).json({ error: 'repre_id debe ser un número entero positivo' });
    }

    if (!Number.isInteger(group_request_id) || group_request_id <= 0) {
      return res.status(400).json({ error: 'group_request_id debe ser un número entero positivo' });
    }

    // Validar que el representante existe y tiene el rol adecuado
    const representative = await prisma.user.findUnique({
      where: { id: repre_id }
    });

    if (!representative) {
      return res.status(404).json({ error: 'Representante no encontrado' });
    }

    console.log(representative);

    if (!representative.is_representative) {
      return res.status(400).json({ 
        error: 'El usuario debe ser representante' 
      });
    }

    // Validar que el group_request existe
    const groupRequest = await prisma.groupRequest.findUnique({
      where: { id: group_request_id }
    });

    if (!groupRequest) {
      return res.status(404).json({ error: 'Solicitud de grupo no encontrada' });
    }

    if (groupRequest.status !== 'CONFIRMED') {
      return res.status(400).json({ 
        error: 'La solicitud de grupo debe estar confirmada' 
      });
    }

    // Validar moderadores si se proporcionan
    // let validatedModeratorIds = [];
    // if (moderators_ids) {
    //   try {
    //     validatedModeratorIds = validateModeratorIdsArray(moderators_ids);
    //   } catch (error) {
    //     return res.status(400).json({ error: error.message });
    //   }

    //   if (validatedModeratorIds.length > 0) {
    //     // Verificar que el representante no esté en moderadores
    //     if (validatedModeratorIds.includes(repre_id)) {
    //       return res.status(400).json({ 
    //         error: 'El representante no puede ser moderador al mismo tiempo' 
    //       });
    //     }

    //     const moderators = await prisma.user.findMany({
    //       where: { 
    //         id: { in: validatedModeratorIds },
    //         // // is_moderator: true
    //       }
    //     });

    //     if (moderators.length !== validatedModeratorIds.length) {
    //       return res.status(400).json({ 
    //         error: 'Algunos moderadores no existen o no tienen el rol adecuado' 
    //       });
    //     }
    //   }
    // }

    // Validar reputation si viene
    let validatedReputation = 0.0;
    if (reputation !== undefined && reputation !== null) {
      const rep = Number(reputation);
      if (isNaN(rep) || rep < 0 || rep > 9.99) {
        return res.status(400).json({ 
          error: 'La reputación debe estar entre 0 y 9.99' 
        });
      }
      validatedReputation = rep;
    }

    const created = await prisma.group.create({
      data: { 
        repre_id,
        group_request_id,
        // moderators_ids: validatedModeratorIds,
        reputation: validatedReputation
      },
      include: {
        groupRequest: true
      }
    });
    
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ 
        error: 'Ya existe un grupo para esta solicitud' 
      });
    }
    if (error?.code === 'P2003') {
      return res.status(400).json({ 
        error: 'Referencia inválida (repre_id o group_request_id no existen)' 
      });
    }
    console.log('ERROR POST /groups:', error);
    res.status(500).json({ error: 'No se pudo crear el grupo' });
  }
});

// PATCH /groups/:id - Actualizar grupo
router.patch('/:id', checkJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Verificar que el grupo existe
    const existingGroup = await prisma.group.findUnique({ 
      where: { id },
      include: { groupRequest: true }
    });

    if (!existingGroup) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    // Obtener usuario que hace la petición
    const requestingUser = await prisma.user.findUnique({ 
      where: { auth0_id: req.auth.sub } 
    });

    if (!requestingUser) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // Verificar permisos: admin, representante del grupo o moderador
    const isAdmin = requestingUser.role === 'ADMIN';
    const isRepresentative = requestingUser.id === existingGroup.repre_id;
    // const moderatorIds = Array.isArray(existingGroup.moderators_ids) 
    //   ? existingGroup.moderators_ids 
    //   : [];
    const isModerator = moderatorIds.includes(requestingUser.id);

    if (!isAdmin && !isRepresentative && !isModerator) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Whitelist de campos editables
    const allowedFields = isAdmin 
      ?? ['repre_id', 'reputation'] // Representantes y moderadores solo pueden cambiar moderadores

    const dataToUpdate = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Validaciones específicas
        if (field === 'repre_id') {
          const newRepreId = req.body[field];
          
          if (!Number.isInteger(newRepreId) || newRepreId <= 0) {
            return res.status(400).json({ 
              error: 'repre_id debe ser un número entero positivo' 
            });
          }

          const newRepre = await prisma.user.findUnique({
            where: { id: newRepreId }
          });
          
          if (!newRepre || !newRepre.is_representative) {
            return res.status(400).json({ 
              error: 'El nuevo representante debe tener el rol adecuado' 
            });
          }
          
          dataToUpdate[field] = newRepreId;
        }

        // if (field === 'moderators_ids') {
        //   try {
        //     const validatedIds = validateModeratorIdsArray(req.body[field]);
            
        //     // Verificar que el representante no esté en moderadores
        //     const currentRepreId = dataToUpdate.repre_id || existingGroup.repre_id;
        //     if (validatedIds.includes(currentRepreId)) {
        //       return res.status(400).json({ 
        //         error: 'El representante no puede ser moderador al mismo tiempo' 
        //       });
        //     }

        //     if (validatedIds.length > 0) {
        //       const moderators = await prisma.user.findMany({
        //         where: { 
        //           id: { in: validatedIds },
        //           // is_moderator: true
        //         }
        //       });
              
        //       if (moderators.length !== validatedIds.length) {
        //         return res.status(400).json({ 
        //           error: 'Algunos moderadores no existen o no tienen el rol adecuado' 
        //         });
        //       }
        //     }
            
        //     dataToUpdate[field] = validatedIds;
        //   } catch (error) {
        //     return res.status(400).json({ error: error.message });
        //   }
        // }

        if (field === 'reputation') {
          const reputation = Number(req.body[field]);
          if (isNaN(reputation) || reputation < 0 || reputation > 9.99) {
            return res.status(400).json({ 
              error: 'La reputación debe estar entre 0 y 9.99' 
            });
          }
          dataToUpdate[field] = reputation;
        }
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    const updated = await prisma.group.update({ 
      where: { id }, 
      data: dataToUpdate,
      include: {
        groupRequest: true
      }
    });
    
    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    if (error?.code === 'P2003') {
      return res.status(400).json({ error: 'Referencia inválida' });
    }
    console.log('ERROR PATCH /groups/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar el grupo' });
  }
});

// DELETE /groups/:id - Eliminar grupo (solo admin)
router.delete('/:id', checkJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Verificar que el usuario es admin
    const requestingUser = await prisma.user.findUnique({ 
      where: { auth0_id: req.auth.sub } 
    });

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Requiere permisos de administrador' });
    }

    // Verificar si el grupo tiene eventos asociados
    const eventCount = await prisma.eventRequest.count({
      where: { group_id: id }
    });

    if (eventCount > 0) {
      return res.status(409).json({ 
        error: `No se puede eliminar: el grupo tiene ${eventCount} eventos asociados` 
      });
    }
    
    await prisma.group.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    if (error?.code === 'P2003') {
      return res.status(409).json({ 
        error: 'No se puede eliminar: grupo tiene registros asociados' 
      });
    }
    console.log('ERROR DELETE /groups/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el grupo' });
  }
});

// GET /groups/:id/events - Obtener eventos del grupo
router.get('/:id/events', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Verificar que el grupo existe
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    const events = await prisma.eventRequest.findMany({
      where: { group_id: id },
      include: {
        publicSpace: {
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true
          }
        },
        eventsScheduling: {
          select: {
            id: true,
            start_time: true,
            end_time: true
          }
        }
      },
      orderBy: { day: 'desc' }
    });

    res.json({
      group_id: id,
      total_events: events.length,
      events
    });
  } catch (error) {
    console.log('ERROR GET /groups/:id/events:', error);
    res.status(500).json({ error: 'No se pudieron obtener los eventos' });
  }
});



// GET /groups/my-groups/:id - Detalle de un grupo que represento
router.get('/my-groups-id/:id', checkJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Encontrar el usuario por auth0_id
    const requestingUser = await prisma.user.findUnique({ 
      where: { auth0_id: req.auth.sub } 
    });

    // Verificar que el usuario es representante
    if (!requestingUser || !requestingUser.is_representative) {
      return res.status(403).json({ error: 'Requiere ser representante' });
    }

    const group = await prisma.group.findUnique({ 
      where: { 
        id,
        repre_id: requestingUser.id  // Solo puede ver grupos que representa
      },
      include: {
        groupRequest: {
          include: {
            user: {
              select: { 
                id: true, 
                first_name: true, 
                last_name: true, 
                email: true,
                role: true 
              }
            }
          }
        },
        eventRequests: {
          include: {
            publicSpace: {
              select: {
                id: true,
                name: true,
                capacity: true,
                location: true
              }
            },
            eventsScheduling: {
              select: {
                id: true,
                start_time: true,
                end_time: true
              }
            }
          },
          orderBy: { day: 'desc' }
        }
      }
    });
    
    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado o no autorizado' });
    }

    // Obtener moderadores
    // const moderatorIds = Array.isArray(group.moderators_ids) 
    //   ? group.moderators_ids 
    //   : [];
    
    // const moderators = moderatorIds.length > 0
    //   ? await prisma.user.findMany({
    //     where: { 
    //       id: { in: moderatorIds },
    //       // is_moderator: true 
    //     },
    //     select: { 
    //       id: true, 
    //       first_name: true, 
    //       last_name: true, 
    //       email: true,
    //       role: true
    //     }
    //   })
    //   : [];

    res.json({
      ...group
    });
  } catch (error) {
    console.log('ERROR GET /groups/my-groups/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el grupo' });
  }
});

// DELETE /groups/my-groups/:id - Eliminar un grupo que represento
router.delete('/my-groups/:id', checkJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Encontrar el usuario por auth0_id
    const requestingUser = await prisma.user.findUnique({ 
      where: { auth0_id: req.auth.sub } 
    });

    // Verificar que el usuario es representante
    if (!requestingUser || !requestingUser.is_representative) {
      return res.status(403).json({ error: 'Requiere ser representante' });
    }

    // Verificar que el grupo pertenece al representante
    const group = await prisma.group.findUnique({ 
      where: { 
        id,
        repre_id: requestingUser.id 
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado o no autorizado' });
    }

    // Verificar si el grupo tiene eventos asociados
    const eventCount = await prisma.eventRequest.count({
      where: { group_id: id }
    });

    if (eventCount > 0) {
      return res.status(409).json({ 
        error: `No se puede eliminar: el grupo tiene ${eventCount} eventos asociados` 
      });
    }
    
    // Eliminar el grupo
    await prisma.group.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    console.log('ERROR DELETE /groups/my-groups/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el grupo' });
  }
});

// router.patch('/my-groups/design-moderators/:id', checkJwt, async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     const { moderators } = req.body;

//     // Validar ID del grupo
//     if (!Number.isInteger(id) || id <= 0) {
//       return res.status(400).json({ error: 'ID inválido' });
//     }

//     // Validar que moderadores sea un array
//     if (!Array.isArray(moderators)) {
//       return res.status(400).json({ error: 'Moderadores debe ser un array' });
//     }

//     // Encontrar el usuario que hace la solicitud
//     const requestingUser = await prisma.user.findUnique({ 
//       where: { auth0_id: req.auth.sub } 
//     });

//     // Verificar que el usuario es representante
//     if (!requestingUser || !requestingUser.is_representative) {
//       return res.status(403).json({ error: 'Requiere ser representante' });
//     }

//     // Verificar que el grupo pertenece al representante
//     const group = await prisma.group.findUnique({ 
//       where: { 
//         id,
//         repre_id: requestingUser.id 
//       }
//     });

//     if (!group) {
//       return res.status(404).json({ error: 'Grupo no encontrado o no autorizado' });
//     }

//     await prisma.user.updateMany({
//       where: { 
//         id: { in: moderators },
//         // is_moderator: false  // Solo actualiza los que no son moderadores
//       },
//       data: {
//         // is_moderator: true
//       }
//     });

//     const validModerators = await prisma.user.findMany({
//       where: { 
//         id: { in: moderators },
//         // is_moderator: true
//       }
//     });

//     // Verificar que todos los IDs proporcionados son moderadores válidos
//     if (validModerators.length !== moderators.length) {
//       return res.status(400).json({ error: 'Algunos moderadores no son válidos' });
//     }

//     // Verificar que el representante no esté en la lista de moderadores
//     if (moderators.includes(requestingUser.id)) {
//       return res.status(400).json({ error: 'El representante no puede ser moderador' });
//     }

//     // Actualizar grupo con nuevos moderadores
//     const updatedGroup = await prisma.group.update({
//       where: { id },
//       data: {
//         moderators_ids: moderators
//       },
//       include: {
//         groupRequest: true
//       }
//     });

//     res.json({
//       message: 'Moderadores actualizados exitosamente',
//       group: updatedGroup
//     });

//   } catch (error) {
//     console.error('ERROR al diseñar moderadores:', error);
//     res.status(500).json({ 
//       error: 'No se pudieron actualizar los moderadores',
//       details: error.message
//     });
//   }
// });

router.patch('/my-groups/transfer-representative/:id', checkJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { new_representative_id } = req.body;

    // Validar ID del grupo
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de grupo inválido' });
    }

    // Validar ID del nuevo representante
    if (!Number.isInteger(new_representative_id) || new_representative_id <= 0) {
      return res.status(400).json({ error: 'ID de representante inválido' });
    }

    // Encontrar el usuario que hace la solicitud
    const requestingUser = await prisma.user.findUnique({ 
      where: { auth0_id: req.auth.sub } 
    });

    // Verificar que el usuario es representante actual
    if (!requestingUser || !requestingUser.is_representative) {
      return res.status(403).json({ error: 'Requiere ser representante' });
    }

    // Verificar que el grupo pertenece al representante actual
    const group = await prisma.group.findUnique({ 
      where: { 
        id,
        repre_id: requestingUser.id 
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado o no autorizado' });
    }

    // Verificar que el nuevo representante es un moderador del grupo
    const newRepresentative = await prisma.user.findUnique({
      where: { id: new_representative_id }
    });

    // Verificar que el nuevo representante existe y es moderador
    if (!newRepresentative) {
      return res.status(400).json({ error: 'El nuevo representante no es válido' });
    }

    // Verificar que el nuevo representante está en la lista de moderadores
    // const moderatorIds = group.moderators_ids || [];
    // if (!moderatorIds.includes(new_representative_id)) {
    //   return res.status(400).json({ 
    //     error: 'El nuevo representante debe ser un moderador del grupo' 
    //   });
    // }

    // Actualizar grupo, removiendo al nuevo representante de la lista de moderadores
    const updatedGroup = await prisma.group.update({
      where: { id },
      data: {
        repre_id: new_representative_id,
        // moderators_ids: moderatorIds.filter(modId => modId !== new_representative_id)
      },
      include: {
        groupRequest: true
      }
    });

    res.json({
      message: 'Representante transferido exitosamente',
      group: updatedGroup
    });

  } catch (error) {
    console.error('ERROR al transferir representante:', error);
    res.status(500).json({ 
      error: 'No se pudo transferir el rol de representante',
      details: error.message
    });
  }
});

module.exports = router;