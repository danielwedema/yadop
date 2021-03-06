import * as doctrine from 'doctrine';
import {tags} from './tags';
import {Module} from './model/module';
import {Entity} from './model/entity';
import {Method} from './model/method';
import {ReturnType} from './model/returnType';
import {ParamType} from './model/paramType';
import {EntityType} from './model/entityType';
import {AttributeType} from './model/attributeType';

/** Ngdoc comments mapper. */
class NgdocMapper {

    /**
     * Maps the comments to a workable output.
     * @param comments The comments.
     */
    map(comments: doctrine.Annotation[]): any {
        const modules: Module[] = this.getModules(comments);
        modules.forEach((module: Module) => {
            module.entities = this.getEntities(comments, module);

            module.entities.forEach((entity: Entity) => {
                entity.methods = this.getMethods(comments, entity);
            });
        });
        return modules;
    }

    /**
     * Indicates if the entity type exists.
     * @param {doctrine.Tag} tag The tag.
     * @return {boolean} indicator The indicator.
     * @private
     */
    private _existingEntityType = (tag: doctrine.Tag): boolean => EntityType[tag.description.toUpperCase()] !== undefined;

    /**
     * Gets all the entities for the given module.
     * @param {doctrine.Annotation[]} comments The comments.
     * @param {Module} module The module.
     * @returns {Entity[]} entities The entities.
     */
    getEntities = (comments: doctrine.Annotation[], module: Module): Entity[] => comments
        .filter(this._onCommentsMatchingModule(module))
        .filter(this._onValidEntityType)
        .map(this._toEntity);

    /**
     * Gets all the methods for the given entity.
     * @param {doctrine.Annotation[]} comments The comments.
     * @param {Entity} entity The entity.
     * @returns {Method[]} methods The methods.
     */
    getMethods = (comments: doctrine.Annotation[], entity: Entity): Method[] => comments
        .filter(this._onCommentsMatchingMethodsOfEntity(entity))
        .filter(this._onTagsMatchingMethod)
        .map(this._toMethod);

    /**
     * Gets all the modules.
     * @param {doctrine.Annotation[]} comments The comments.
     * @returns {Module[]} modules The modules.
     */
    getModules = (comments: doctrine.Annotation[]): Module[] => comments
        .filter(this._onCommentsContainingTheModuleAnnotation)
        .map(this._toModule);

    /**
     * Indicates if the comment contains tag @ngdoc module.
     * @param {doctrine.Annotation} comment The comment.
     * @return {boolean} indicator The indicator.
     * @private
     */
    private _onCommentsContainingTheModuleAnnotation = (comment: doctrine.Annotation): boolean => comment.tags
        .filter(tags.annotations.ngdoc)
        .filter(tags.values.module).length > 0;

    /**
     * Indicates if the comment matches the given module name.
     * @param {Module} module The module.
     * @return {boolean} indicator The indicator.
     * @private
     */
    private _onCommentsMatchingModule = (module: Module) => (comment: doctrine.Annotation): boolean => comment.tags
        .filter(tags.annotations.module)
        .filter((tag: any) => tag.name === module.name) // match module name
        .length > 0;

    /**
     * Indicates if the comment matches the given entity name.
     * @param {Entity} entity The entity.
     * @return {boolean} indicator The indicator.
     * @private
     */
    private _onCommentsMatchingMethodsOfEntity = (entity: Entity) => (comment: doctrine.Annotation): boolean => comment.tags
        .filter(tags.annotations.methodOfTag)
        .filter((tag: any) => tag.description === entity.name)
        .length > 0;

    /**
     * Indicates if the comment contains tag @method.
     * @param {Entity} entity The entity.
     * @return {boolean} indicator The indicator.
     * @private
     */
    private _onTagsMatchingEntity = (entity: Entity) => (comment: doctrine.Annotation): boolean => comment.tags
        .filter((tag: any) => tag.title === 'name' && tag.name === entity.name)
        .length > 0;

    /**
     * Indicates if the comment contains tag @method.
     * @param {doctrine.Annotation} comment The entity.
     * @return {boolean} indicator The indicator.
     * @private
     */
    private _onTagsMatchingMethod = (comment: doctrine.Annotation): boolean => comment.tags
        .filter(tags.annotations.ngdoc)
        .filter(tags.values.method)
        .length > 0;

    /**
     * Indicates if the comment contains tag @requires.
     * @param {doctrine.Annotation} comment The entity.
     * @return {boolean} indicator The indicator.
     * @private
     */
    private _onTagsMatchingRequires = (comment: doctrine.Annotation): boolean => comment.tags
        .filter(tags.annotations.requires)
        .length > 0;

    /**
     * Indicates if the entity type is valid.
     * @param {doctrine.Annotation} comment The comment.
     * @return {boolean} indicator The indicator.
     * @private
     */
    private _onValidEntityType = (comment: doctrine.Annotation): boolean => comment.tags
        .filter(tags.annotations.ngdoc)
        .filter(this._existingEntityType)
        .length > 0;

    /**
     * Gets the parameters if present.
     * @param {doctrine.Annotation} comment The entity.
     * @return {ParamType[]} paramTypes The paramTypes.
     * @private
     */
    private _getParams = (comment: doctrine.Annotation): ParamType[] => {
        const paramTypes: ParamType[] = [];

        comment.tags.filter(tags.annotations.param).forEach((tag: any) => {
            const paramType: ParamType = {
                name: tag.name,
            };
            if (tag.description !== null) {
                paramType.description = tag.description;
            }
            if (tag.type !== null) {
                paramType.type = tag.type.name;
            }
            paramTypes.push(paramType);
        });
        return paramTypes;
    };

    /**
     * Gets the return if present.
     * @param {doctrine.Annotation} comment The entity.
     * @return {ReturnType} returnType The returnType.
     * @private
     */
    private _getReturn = (comment: doctrine.Annotation): ReturnType => {
        let returnType: ReturnType;

        const tag = comment.tags.find(tags.annotations.returns);
        if (tag !== undefined) {
            returnType = {
                name: tag.description
            };
            if (tag.type !== null) {
                returnType.type = (tag.type as any).name;
            }
        }
        return returnType;
    };

    /**
     * Gets the deprecated tag if present.
     * @param {doctrine.Annotation} comment The entity.
     * @return {doctrine.Tag} tag The tag.
     * @private
     */
    private _getDeprecated = (comment: doctrine.Annotation): doctrine.Tag =>
        comment.tags.find(tags.annotations.deprecated);

    /**
     * Gets all the requires for the given entity.
     * @param {doctrine.Annotation} comment The comment.
     * @returns {string[]} requires The requires.
     */
    private _getRequires = (comment: doctrine.Annotation): string[] =>
        comment.tags.filter(tags.annotations.requires).map((tag) => (tag as any).name);

    /**
     * Gets all the attributes for the given entity.
     * @param {doctrine.Annotation} comment The comment.
     * @returns {AttributeType[]} attributes The attributes.
     */
    private _getAttributes = (comment: doctrine.Annotation): AttributeType[] =>
        comment.tags.filter(tags.annotations.param).map((tag: any) => {
            const attributeType: AttributeType = {
                name: tag.name,
                optional: false
            };

            if (tag.description !== null) {
                attributeType.description = tag.description;
            }

            if (tag.type !== null) {
                let type = tag.type;
                if (type.type === 'OptionalType') {
                    attributeType.optional = true;
                    type = type.expression;
                }

                if (type.type === 'TypeApplication') {
                    if (type.expression.name === 'Array') {
                        attributeType.type = type.applications
                                .map((application) => application.name)
                                .join() + '[]';
                    }
                } else {
                    attributeType.type = type.name;
                }
            }
            return attributeType;
        });
    /**
     * Converts the given comment to an Entity.
     * @param {doctrine.Annotation} comment The entity.
     * @return {Entity} entity The entity.
     * @private
     */
    private _toEntity = (comment: doctrine.Annotation): Entity => {
        const entity: Entity = {
            name: (comment.tags.find(tags.annotations.name)as any).name,
            type: comment.tags.find(tags.annotations.ngdoc).description,
            attributes: this._getAttributes(comment),
            requires: this._getRequires(comment)
        };

        const deprecated = this._getDeprecated(comment);
        if (deprecated !== undefined) {
            entity.deprecated = deprecated.description;
        }

        const description = comment.tags.find(tags.annotations.description);
        if (description !== undefined) {
            entity.description = description.description;
        }
        return entity;
    };

    /**
     * Converts the given comment to a method.
     * @param {doctrine.Annotation} comment The entity.
     * @return {Method} method The method.
     * @private
     */
    private _toMethod = (comment: doctrine.Annotation): Method => {
        const methodName = (comment.tags.find(tags.annotations.name)as any).name;
        const method: Method = {
            name: methodName.substring(methodName.indexOf('#') + 1, methodName.length),
            description: (comment.tags.find(tags.annotations.description)as any).description
        };

        const deprecated = this._getDeprecated(comment);
        if (deprecated !== undefined) {
            method.deprecated = deprecated.description;
        }

        const returnType = this._getReturn(comment);
        if (returnType !== undefined) {
            method.returns = returnType;
        }

        const paramTypes = this._getParams(comment);
        if (paramTypes.length > 0) {
            method.params = paramTypes;
        }
        return method;
    };

    /**
     * Converts the given comment to a Module.
     * @param {doctrine.Annotation} comment The comment.
     * @return {Module} module The module.
     * @private
     */
    private _toModule = (comment: doctrine.Annotation): Module => ({
        name: (comment.tags.find((tag) => tag.title === 'name') as any).name
    });
}

export default NgdocMapper;
