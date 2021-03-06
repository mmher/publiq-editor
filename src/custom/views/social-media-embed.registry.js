/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module media-embed/mediaregistry
 */

/* globals console */

import mediaPlaceholderIcon from '@ckeditor/ckeditor5-media-embed/theme/icons/media-placeholder.svg';
import TooltipView from '@ckeditor/ckeditor5-ui/src/tooltip/tooltipview';
import IconView from '@ckeditor/ckeditor5-ui/src/icon/iconview';
import Template from '@ckeditor/ckeditor5-ui/src/template';
import { attachLinkToDocumentation } from '@ckeditor/ckeditor5-utils/src/ckeditorerror';

const mediaPlaceholderIconViewBox = '0 0 64 42';

/**
 * A bridge between the raw media content provider definitions and the editor view content.
 *
 * It helps translating media URLs to corresponding {@link module:engine/view/element~Element view elements}.
 *
 * Mostly used by the {@link module:media-embed/mediaembedediting~MediaEmbedEditing} plugin.
 */
export default class SocialMediaEmbedRegistry {
	/**
	 * Creates an instance of the {@link module:media-embed/mediaregistry~MediaRegistry} class.
	 *
	 * @param {module:utils/locale~Locale} locale The localization services instance.
	 * @param {module:media-embed/mediaembed~MediaEmbedConfig} config The configuration of the media embed feature.
	 */
	constructor( locale, config ) {
		const extraProviders = config.extraProviders || [];
		const removedProviders = new Set( config.removeProviders );
		const providerDefinitions = extraProviders
			.filter( provider => {
				const name = provider.name;

				if ( !name ) {
					/**
					 * One of the providers (or extra providers) specified in the media embed configuration
					 * has no name and will not be used by the editor. In order to get this media
					 * provider working, double check your editor configuration.
					 *
					 * @warning media-embed-no-provider-name
					 */
					console.warn( attachLinkToDocumentation(
						'media-embed-no-provider-name: The configured media provider has no name and cannot be used.'
					), { provider } );

					return false;
				}

				return !removedProviders.has( name );
			} );

		/**
		 * The locale {@link module:utils/locale~Locale} instance.
		 *
		 * @member {module:utils/locale~Locale}
		 */
		this.locale = locale;

		/**
		 * The media provider definitions available for the registry. Usually corresponding with the
		 * {@link module:media-embed/mediaembed~MediaEmbedConfig media configuration}.
		 *
		 * @member {Array}
		 */
		this.providerDefinitions = providerDefinitions;
	}

	/**
	 * Checks whether the passed EMBED is representing a certain media type allowed in the editor.
	 *
	 * @param {String} embed The EMBED to be checked
	 * @returns {Boolean}
	 */
	hasMedia( embed ) {
		return !!this._getMedia( embed );
	}

	/**
	 * For the given media URL string and options, it returns the {@link module:engine/view/element~Element view element}
	 * representing that media.
	 *
	 * **Note:** If no URL is specified, an empty view element is returned.
	 *
	 * @param {module:engine/view/downcastwriter~DowncastWriter} writer The view writer used to produce a view element.
	 * @param {String} embed The EMBED to be translated into a view element.
	 * @param {Object} options
	 * @param {String} [options.renderMediaPreview]
	 * @param {String} [options.renderForEditingView]
	 * @returns {module:engine/view/element~Element}
	 */
	getMediaViewElement( writer, embed, options ) {
		return this._getMedia( embed ).getViewElement( writer, options );
	}

	/**
	 * Returns a `Media` instance for the given URL.
	 *
	 * @protected
	 * @param {String} url The URL of the media.
	 * @returns {module:media-embed/mediaregistry~Media|null} The `Media` instance or `null` when there is none.
	 */
	_getMedia( embed ) {
		if ( !embed ) {
			return new Media( this.locale );
		}
		const embedCode = embed.code ? embed.code : embed;

		for ( const definition of this.providerDefinitions ) {
			const previewRenderer = definition.html;
			let pattern = definition.url;

			if ( !Array.isArray( pattern ) ) {
				pattern = [ pattern ];
			}

			for ( const subPattern of pattern ) {
				const match = this._getEmbedMatches( embed, subPattern );

				if ( match ) {
					return new Media( this.locale, embedCode, match, previewRenderer );
				}
			}
		}

		return null;
	}

	_getMatch( embed ) {
		if ( !embed ) {
			return '';
		}
		let match;
		for ( const definition of this.providerDefinitions ) {
			let pattern = definition.url;

			if ( !Array.isArray( pattern ) ) {
				pattern = [ pattern ];
			}

			for ( const subPattern of pattern ) {
				match = this._getEmbedMatches( embed, subPattern );

				if ( match ) {
					break;
				}
			}
			if ( match ) {
				break;
			}
		}

		return match;
	}

	/**
	 * Tries to match `embed` to `pattern`.
	 *
	 * @private
	 * @param {String} embed The EMBED of the media.
	 * @param {RegExp} pattern The pattern that should accept the media EMBED.
	 * @returns {Array|null}
	 */
	_getEmbedMatches( embed, pattern ) {
		// 1. Try to match without stripping the protocol and "www" subdomain.
		const embedCode = embed.code ? embed.code : embed;
		const match = embedCode.match( pattern );

		return match;
	}
}

/**
 * Represents media defined by the provider configuration.
 *
 * It can be rendered to the {@link module:engine/view/element~Element view element} and used in the editing or data pipeline.
 *
 * @private
 */
class Media {
	constructor( locale, embed, match, previewRenderer ) {
		/**
		 * The URL this Media instance represents.
		 *
		 * @member {String}
		 */
		this.embed = embed; // this._getValidEmbed( embed );

		/**
		 * Shorthand for {@link module:utils/locale~Locale#t}.
		 *
		 * @see module:utils/locale~Locale#t
		 * @method
		 */
		this._t = locale.t;

		/**
		 * The output of the `RegExp.match` which validated the {@link #url} of this media.
		 *
		 * @member {Object}
		 */
		this._match = match;

		/**
		 * The function returning the HTML string preview of this media.
		 *
		 * @member {Function}
		 */
		this._previewRenderer = previewRenderer;
	}

	/**
	 * Returns the view element representation of the media.
	 *
	 * @param {module:engine/view/downcastwriter~DowncastWriter} writer The view writer used to produce a view element.
	 * @param {Object} options
	 * @param {String} [options.renderMediaPreview]
	 * @param {String} [options.renderForEditingView]
	 * @returns {module:engine/view/element~Element}
	 */
	getViewElement( writer, options ) {
		const attributes = {};

		if ( options.renderForEditingView || ( options.renderMediaPreview && this.embed && this._previewRenderer ) ) {
			if ( options.renderForEditingView ) {
				attributes.class = 'ck-media__wrapper';
			}

			const mediaHtml = this._getPreviewHtml( options );

			return writer.createUIElement( 'div', attributes, function( domDocument ) {
				const domElement = this.toDomElement( domDocument );

				domElement.innerHTML = mediaHtml;

				return domElement;
			} );
		} else {
			if ( this.embed ) {
				attributes.embed = this.embed;
			}

			return writer.createEmptyElement( 'oembed', attributes );
		}
	}

	/**
	 * Returns the HTML string of the media content preview.
	 *
	 * @param {module:engine/view/downcastwriter~DowncastWriter} writer The view writer used to produce a view element.
	 * @param {Object} options
	 * @param {String} [options.renderForEditingView]
	 * @returns {String}
	 */
	_getPreviewHtml( options ) {
		if ( this._previewRenderer ) {
			return this._previewRenderer( this._match );
		} else {
			// The placeholder only makes sense for editing view and media which have URLs.
			// Placeholder is never displayed in data and URL-less media have no content.
			if ( this.embed && options.renderForEditingView ) {
				return this._getPlaceholderHtml();
			}

			return '';
		}
	}

	/**
	 * Returns the placeholder HTML when the media has no content preview.
	 *
	 * @returns {String}
	 */
	_getPlaceholderHtml() {
		const tooltip = new TooltipView();
		const icon = new IconView();

		tooltip.text = this._t( 'Open media in new tab' );
		icon.content = mediaPlaceholderIcon;
		icon.viewBox = mediaPlaceholderIconViewBox;

		const placeholder = new Template( {
			tag: 'textarea',
			attributes: {
				class: 'ck ck-reset_all ck-media__placeholder'
			},
			children: [
				{
					tag: 'div',
					attributes: {
						class: 'ck-media__placeholder__icon'
					},
					children: [ icon ]
				},
				{
					tag: 'a',
					attributes: {
						class: 'ck-media__placeholder__url',
						target: '_blank',
						rel: 'noopener noreferrer',
						href: this.url
					},
					children: [
						{
							tag: 'span',
							attributes: {
								class: 'ck-media__placeholder__url__text'
							},
							children: [ this.url ]
						},
						tooltip
					]
				}
			]
		} ).render();

		return placeholder.outerHTML;
	}

/*	/!**
	 * Returns the valid media embed.
	 *
	 * @param {String} embed The EMBED code of the media.
	 * @returns {String|null}
	 *!/
	_getValidEmbed( embed ) {
		if ( !embed ) {
			return null;
		}

		if ( embed.match( /^https?/ ) ) {
			return embed;
		}

		return 'https://' + embed;
	}*/
}
